export async function resendSignupVerificationEmail(email: string) {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  if (!url || !anon) {
    throw new Error("Missing Supabase environment variables");
  }

  const res = await fetch(`${url}/auth/v1/resend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
    body: JSON.stringify({
      type: "signup",
      email,
      email_redirect_to: `${window.location.origin}/`,
    }),
  });

  if (!res.ok) {
    let msg = "Failed to resend verification email";
    try {
      const data = await res.json();
      msg = data?.msg || data?.message || msg;
    } catch {}
    throw new Error(msg);
  }
}