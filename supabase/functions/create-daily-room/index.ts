import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/errors.ts";
import { verifyAuth } from "../_shared/auth.ts";

// =============================================================================
// CONFIGURATION
// =============================================================================
const CONFIG = {
  daily: {
    apiUrl: "https://api.daily.co/v1",
    roomExpiryBufferMinutes: 30,
    maxParticipants: 2,
    requestTimeoutMs: 10_000,
    maxRetries: 2,
    retryDelayMs: 500,
    defaultDurationMinutes: 60,
  },
  roomNamePrefix: "vd",
} as const;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// =============================================================================
// TYPES
// =============================================================================
interface VideoDate {
  id: string;
  seeker_id: string;
  earner_id: string;
  status: string;
  scheduled_start: string;
  scheduled_duration: number;
  daily_room_url: string | null;
  seeker_meeting_token: string | null;
  earner_meeting_token: string | null;
}

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  privacy: string;
  created_at: string;
}

interface DailyMeetingToken {
  token: string;
}

interface RequestBody {
  videoDateId?: string;
  onAcceptance?: boolean;
}

// =============================================================================
// STRUCTURED LOGGING
// =============================================================================
interface LogContext {
  requestId: string;
  userId?: string;
  videoDateId?: string;
  [key: string]: unknown;
}

const createLogger = (requestId: string) => {
  const baseContext: LogContext = { requestId };

  return {
    setContext: (ctx: Partial<LogContext>) => {
      Object.assign(baseContext, ctx);
    },
    info: (step: string, details?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: "INFO",
        service: "create-daily-room",
        step,
        ...baseContext,
        ...details,
        timestamp: new Date().toISOString(),
      }));
    },
    warn: (step: string, details?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: "WARN",
        service: "create-daily-room",
        step,
        ...baseContext,
        ...details,
        timestamp: new Date().toISOString(),
      }));
    },
    error: (step: string, error: unknown, details?: Record<string, unknown>) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(JSON.stringify({
        level: "ERROR",
        service: "create-daily-room",
        step,
        error: errorMessage,
        stack: errorStack,
        ...baseContext,
        ...details,
        timestamp: new Date().toISOString(),
      }));
    },
  };
};

type Logger = ReturnType<typeof createLogger>;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
const generateRequestId = (): string => {
  return `cdr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function getRequiredEnv(name: string, logger: Logger): string {
  const value = Deno.env.get(name);
  if (!value) {
    logger.error("missing_env_var", new Error(`Missing: ${name}`), { envVar: name });
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

function generateRoomName(videoDateId: string): string {
  const shortId = videoDateId.substring(0, 8);
  const timestamp = Date.now().toString(36);
  return `${CONFIG.roomNamePrefix}-${shortId}-${timestamp}`;
}

function calculateRoomExpiry(scheduledStart: string, durationMinutes: number): number {
  const startTime = new Date(scheduledStart).getTime();

  // Fallback if invalid date
  const baseMs = Number.isFinite(startTime)
    ? startTime + durationMinutes * 60 * 1000
    : Date.now() + CONFIG.daily.defaultDurationMinutes * 60 * 1000;

  const expiryTime = baseMs + CONFIG.daily.roomExpiryBufferMinutes * 60 * 1000;
  return Math.floor(expiryTime / 1000); // Unix timestamp in seconds
}

// =============================================================================
// DAILY.CO API CLIENT
// =============================================================================
class DailyApiClient {
  private apiKey: string;
  private logger: Logger;

  constructor(apiKey: string, logger: Logger) {
    this.apiKey = apiKey;
    this.logger = logger;
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    operation: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= CONFIG.daily.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.daily.requestTimeoutMs);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Daily API error (${response.status}): ${errorText}`);
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx)
        if (lastError.message.includes("(4")) {
          throw lastError;
        }

        if (attempt < CONFIG.daily.maxRetries) {
          const delay = CONFIG.daily.retryDelayMs * Math.pow(2, attempt);
          this.logger.warn("daily_api_retry", {
            operation,
            attempt: attempt + 1,
            error: lastError.message,
            delayMs: delay,
          });
          await sleep(delay);
        }
      }
    }

    this.logger.error("daily_api_failed", lastError, { operation });
    throw lastError;
  }

  async createRoom(params: {
    name: string;
    expiry: number;
    maxParticipants: number;
  }): Promise<DailyRoom> {
    this.logger.info("creating_daily_room", { roomName: params.name, expiry: params.expiry });

    const room = await this.fetchWithRetry<DailyRoom>(
      `${CONFIG.daily.apiUrl}/rooms`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          name: params.name,
          privacy: "private",
          properties: {
            exp: params.expiry,
            max_participants: params.maxParticipants,
            enable_screenshare: false,
            enable_chat: true,
            enable_knocking: false,
            start_video_off: false,
            start_audio_off: false,
            eject_at_room_exp: true,
          },
        }),
      },
      "createRoom"
    );

    this.logger.info("daily_room_created", { roomUrl: room.url, roomName: room.name });
    return room;
  }

  async createMeetingToken(params: {
    roomName: string;
    participantId: string;
    isOwner: boolean;
    expiry: number;
  }): Promise<string> {
    const tokenResponse = await this.fetchWithRetry<DailyMeetingToken>(
      `${CONFIG.daily.apiUrl}/meeting-tokens`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          properties: {
            room_name: params.roomName,
            user_id: params.participantId,
            is_owner: params.isOwner,
            exp: params.expiry,
          },
        }),
      },
      `createMeetingToken:${params.isOwner ? "owner" : "participant"}`
    );

    return tokenResponse.token;
  }

  async deleteRoom(roomName: string): Promise<void> {
    try {
      await this.fetchWithRetry<{ deleted: boolean }>(
        `${CONFIG.daily.apiUrl}/rooms/${roomName}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
        "deleteRoom"
      );
      this.logger.info("daily_room_deleted", { roomName });
    } catch (error) {
      // Non-critical: log but don't fail
      this.logger.warn("daily_room_delete_failed", { roomName, error: (error as Error).message });
    }
  }
}

// =============================================================================
// VIDEO DATE OPERATIONS
// =============================================================================
async function fetchVideoDate(
  supabase: SupabaseClient,
  videoDateId: string,
  logger: Logger
): Promise<VideoDate> {
  const { data, error } = await supabase
    .from("video_dates")
    .select("id, seeker_id, earner_id, status, scheduled_start, scheduled_duration, daily_room_url, seeker_meeting_token, earner_meeting_token")
    .eq("id", videoDateId)
    .single();

  if (error) {
    logger.error("video_date_fetch_failed", error, { videoDateId });
    throw new Error("Video date not found");
  }

  return data as VideoDate;
}

async function updateVideoDateWithRoom(
  supabase: SupabaseClient,
  videoDateId: string,
  roomData: {
    roomUrl: string;
    roomName: string;
    seekerToken: string;
    earnerToken: string;
  },
  logger: Logger
): Promise<{ updated: boolean; existingRoomUrl?: string }> {
  // Atomic update with CAS condition (only if daily_room_url is null)
  const { data: updatedRows, error } = await supabase
    .from("video_dates")
    .update({
      daily_room_url: roomData.roomUrl,
      seeker_meeting_token: roomData.seekerToken,
      earner_meeting_token: roomData.earnerToken,
      status: "scheduled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", videoDateId)
    .is("daily_room_url", null)
    .select("daily_room_url");

  if (error) {
    logger.error("video_date_update_failed", error, { videoDateId });
    throw new Error(`Failed to update video date: ${error.message}`);
  }

  if (!updatedRows || updatedRows.length !== 1) {
    // CAS failed: another request created room concurrently
    logger.info("video_date_update_race_condition", { videoDateId });

    const { data: current } = await supabase
      .from("video_dates")
      .select("daily_room_url")
      .eq("id", videoDateId)
      .single();

    return {
      updated: false,
      existingRoomUrl: (current as { daily_room_url: string } | null)?.daily_room_url,
    };
  }

  logger.info("video_date_room_saved", { videoDateId, roomUrl: roomData.roomUrl });
  return { updated: true };
}

// =============================================================================
// VALIDATION
// =============================================================================
interface ValidationResult {
  valid: true;
  videoDateId: string;
  onAcceptance: boolean;
}

interface ValidationError {
  valid: false;
  error: string;
  code: string;
}

function validateRequest(body: RequestBody): ValidationResult | ValidationError {
  const { videoDateId, onAcceptance = false } = body;

  if (!videoDateId || typeof videoDateId !== "string") {
    return { valid: false, error: "videoDateId is required", code: "missing_video_date_id" };
  }

  if (!isValidUUID(videoDateId)) {
    return { valid: false, error: "Invalid videoDateId format", code: "invalid_video_date_id" };
  }

  return {
    valid: true,
    videoDateId,
    onAcceptance: Boolean(onAcceptance),
  };
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================
function jsonResponse(
  data: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
serve(async (req: Request): Promise<Response> => {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  const corsHeaders = getCorsHeaders(req);
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Method check
  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", "method_not_allowed", corsHeaders, 405);
  }

  logger.info("request_started");

  try {
    // Load environment variables
    let dailyApiKey: string;
    let supabaseUrl: string;
    let supabaseServiceKey: string;

    try {
      dailyApiKey = getRequiredEnv("DAILY_API_KEY", logger);
      supabaseUrl = getRequiredEnv("SUPABASE_URL", logger);
      supabaseServiceKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", logger);
    } catch {
      return createErrorResponse("Server configuration error", "config_error", corsHeaders, 500);
    }

    // Authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      logger.warn("auth_failed", { error: authError });
      return createErrorResponse("Unauthorized", "unauthorized", corsHeaders, 401);
    }

    logger.setContext({ userId: user.id });
    logger.info("user_authenticated");

    // Parse and validate request
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", "invalid_json", corsHeaders, 400);
    }

    const validation = validateRequest(body);
    if (!validation.valid) {
      return createErrorResponse(validation.error, validation.code, corsHeaders, 400);
    }

    const { videoDateId, onAcceptance } = validation;
    logger.setContext({ videoDateId });
    logger.info("input_validated", { onAcceptance });

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    const dailyClient = new DailyApiClient(dailyApiKey, logger);

    // Fetch video date
    const videoDate = await fetchVideoDate(supabase, videoDateId, logger);
    logger.info("video_date_fetched", {
      status: videoDate.status,
      hasRoom: !!videoDate.daily_room_url,
      seekerId: videoDate.seeker_id,
      earnerId: videoDate.earner_id,
    });

    // Authorization: only participants can create room
    const isSeeker = user.id === videoDate.seeker_id;
    const isEarner = user.id === videoDate.earner_id;

    if (!isSeeker && !isEarner) {
      logger.warn("forbidden_access", { userId: user.id, seekerId: videoDate.seeker_id, earnerId: videoDate.earner_id });
      return createErrorResponse("Only participants can create rooms", "forbidden", corsHeaders, 403);
    }

    // On acceptance flow: only earner can create
    if (onAcceptance && !isEarner) {
      logger.warn("acceptance_not_earner", { userId: user.id, earnerId: videoDate.earner_id });
      return createErrorResponse("Only the earner can create the room upon acceptance", "forbidden", corsHeaders, 403);
    }

    // Idempotency: room already exists
    if (videoDate.daily_room_url) {
      logger.info("room_already_exists", { roomUrl: videoDate.daily_room_url });
      return jsonResponse(
        {
          success: true,
          roomUrl: videoDate.daily_room_url,
          message: "Room already exists",
          requestId,
        },
        200,
        corsHeaders
      );
    }

    // Calculate room parameters
    const roomExpiry = calculateRoomExpiry(videoDate.scheduled_start, videoDate.scheduled_duration);
    const roomName = generateRoomName(videoDateId);

    logger.info("creating_room", {
      roomName,
      scheduledStart: videoDate.scheduled_start,
      durationMinutes: videoDate.scheduled_duration,
      expiryTimestamp: roomExpiry,
    });

    // Create Daily room
    const room = await dailyClient.createRoom({
      name: roomName,
      expiry: roomExpiry,
      maxParticipants: CONFIG.daily.maxParticipants,
    });

    // Create meeting tokens for both participants in parallel
    const [seekerToken, earnerToken] = await Promise.all([
      dailyClient.createMeetingToken({
        roomName: room.name,
        participantId: videoDate.seeker_id,
        isOwner: false,
        expiry: roomExpiry,
      }),
      dailyClient.createMeetingToken({
        roomName: room.name,
        participantId: videoDate.earner_id,
        isOwner: true,
        expiry: roomExpiry,
      }),
    ]);

    logger.info("meeting_tokens_created");

    // Save room info to video date (atomic with CAS)
    const updateResult = await updateVideoDateWithRoom(
      supabase,
      videoDateId,
      {
        roomUrl: room.url,
        roomName: room.name,
        seekerToken,
        earnerToken,
      },
      logger
    );

    if (!updateResult.updated) {
      // Another request won the race - clean up our room
      logger.info("race_condition_cleanup", { roomName: room.name });
      await dailyClient.deleteRoom(room.name);

      return jsonResponse(
        {
          success: true,
          roomUrl: updateResult.existingRoomUrl ?? room.url,
          message: "Room already exists (concurrent creation)",
          requestId,
        },
        200,
        corsHeaders
      );
    }

    const duration = Date.now() - startTime;
    logger.info("request_completed", { durationMs: duration, roomUrl: room.url, roomName: room.name });

    return jsonResponse(
      {
        success: true,
        roomUrl: room.url,
        roomName: room.name,
        requestId,
      },
      200,
      corsHeaders
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    logger.error("request_failed", error, { durationMs: duration });

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Map known errors to appropriate status codes
    if (errorMessage.includes("not found")) {
      return createErrorResponse("Video date not found", "not_found", corsHeaders, 404);
    }

    if (errorMessage.includes("Daily API")) {
      return createErrorResponse("Video service temporarily unavailable", "video_service_error", corsHeaders, 503);
    }

    return createErrorResponse(
      "An error occurred while creating the room",
      "internal_error",
      corsHeaders,
      500
    );
  }
});
