import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AdminManagement } from '@/components/admin/AdminManagement';

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-white/60">Configure platform settings</p>
      </div>

      <div className="grid gap-6">
        {/* Admin Management */}
        <AdminManagement />

        <Separator className="bg-white/10" />

        {/* Pricing Settings */}
        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Pricing Configuration</CardTitle>
            <CardDescription className="text-white/60">Set platform pricing and fees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Text Message Cost (credits)</Label>
                <Input type="number" defaultValue={20} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Image Message Cost (credits)</Label>
                <Input type="number" defaultValue={40} className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Platform Fee (%)</Label>
                <Input type="number" defaultValue={30} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Earner Share (%)</Label>
                <Input type="number" defaultValue={70} disabled className="bg-white/5 border-white/10 text-white/60" />
              </div>
            </div>
            <Button>Save Pricing</Button>
          </CardContent>
        </Card>

        {/* Credit Packages */}
        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Credit Packages</CardTitle>
            <CardDescription className="text-white/60">Configure credit purchase options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Basic Package</Label>
                <Input type="number" defaultValue={100} className="bg-white/5 border-white/10 text-white" />
                <Input type="number" defaultValue={10} placeholder="Price ($)" className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Standard Package</Label>
                <Input type="number" defaultValue={500} className="bg-white/5 border-white/10 text-white" />
                <Input type="number" defaultValue={45} placeholder="Price ($)" className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Premium Package</Label>
                <Input type="number" defaultValue={1000} className="bg-white/5 border-white/10 text-white" />
                <Input type="number" defaultValue={80} placeholder="Price ($)" className="bg-white/5 border-white/10 text-white placeholder:text-white/40" />
              </div>
            </div>
            <Button>Save Packages</Button>
          </CardContent>
        </Card>

        <Separator className="bg-white/10" />

        {/* Feature Toggles */}
        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Feature Toggles</CardTitle>
            <CardDescription className="text-white/60">Enable or disable platform features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Video Dates</Label>
                <p className="text-sm text-white/40">Allow users to book video dates</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Success Stories</Label>
                <p className="text-sm text-white/40">Allow users to submit success stories</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">New User Signups</Label>
                <p className="text-sm text-white/40">Allow new users to register</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Maintenance Mode</Label>
                <p className="text-sm text-white/40">Show maintenance page to users</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Fraud Detection */}
        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Fraud Detection</CardTitle>
            <CardDescription className="text-white/60">Configure fraud detection thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">High Risk Threshold (score)</Label>
                <Input type="number" defaultValue={200} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Medium Risk Threshold (score)</Label>
                <Input type="number" defaultValue={100} className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Auto-Reject High Risk</Label>
                <p className="text-sm text-white/40">Automatically reject high risk submissions</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Button>Save Fraud Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}