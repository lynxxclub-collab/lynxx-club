import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Configure platform settings</p>
      </div>

      <div className="grid gap-6">
        {/* Pricing Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Configuration</CardTitle>
            <CardDescription>Set platform pricing and fees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Text Message Cost (credits)</Label>
                <Input type="number" defaultValue={20} />
              </div>
              <div className="space-y-2">
                <Label>Image Message Cost (credits)</Label>
                <Input type="number" defaultValue={40} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform Fee (%)</Label>
                <Input type="number" defaultValue={30} />
              </div>
              <div className="space-y-2">
                <Label>Earner Share (%)</Label>
                <Input type="number" defaultValue={70} disabled />
              </div>
            </div>
            <Button>Save Pricing</Button>
          </CardContent>
        </Card>

        {/* Credit Packages */}
        <Card>
          <CardHeader>
            <CardTitle>Credit Packages</CardTitle>
            <CardDescription>Configure credit purchase options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Basic Package</Label>
                <Input type="number" defaultValue={100} />
                <Input type="number" defaultValue={10} placeholder="Price ($)" />
              </div>
              <div className="space-y-2">
                <Label>Standard Package</Label>
                <Input type="number" defaultValue={500} />
                <Input type="number" defaultValue={45} placeholder="Price ($)" />
              </div>
              <div className="space-y-2">
                <Label>Premium Package</Label>
                <Input type="number" defaultValue={1000} />
                <Input type="number" defaultValue={80} placeholder="Price ($)" />
              </div>
            </div>
            <Button>Save Packages</Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Toggles</CardTitle>
            <CardDescription>Enable or disable platform features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Video Dates</Label>
                <p className="text-sm text-muted-foreground">Allow users to book video dates</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Success Stories</Label>
                <p className="text-sm text-muted-foreground">Allow users to submit success stories</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>New User Signups</Label>
                <p className="text-sm text-muted-foreground">Allow new users to register</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Show maintenance page to users</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Fraud Detection */}
        <Card>
          <CardHeader>
            <CardTitle>Fraud Detection</CardTitle>
            <CardDescription>Configure fraud detection thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>High Risk Threshold (score)</Label>
                <Input type="number" defaultValue={200} />
              </div>
              <div className="space-y-2">
                <Label>Medium Risk Threshold (score)</Label>
                <Input type="number" defaultValue={100} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Reject High Risk</Label>
                <p className="text-sm text-muted-foreground">Automatically reject high risk submissions</p>
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
