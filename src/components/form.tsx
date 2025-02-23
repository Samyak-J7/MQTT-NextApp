"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { TriggerMode } from "@/app/types";
import { ChevronsUpDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function UserForm() {
  const [mode, setMode] = useState<string | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 max-h-[95%] sm:p-0 p-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">MQTT Scheduler</CardTitle>
          <CardDescription>
            Configure triggers and schedules for your IoT devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="devId">Device ID</Label>
                <Input
                  id="devId"
                  type="text"
                  placeholder="Enter your device ID"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="key">Key/Code</Label>
                <Input
                  id="key"
                  type="text"
                  placeholder="Enter the key value"
                  required
                />
              </div>
              <div>
                <Select onValueChange={(value) => setMode(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Trigger/Schedule Mode</SelectLabel>
                      {Object.entries(TriggerMode).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {mode && (
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                  <div className="flex items-center justify-between px-4">
                    <h4 className="text-sm font-semibold">
                      4 Relay Configuration
                    </h4>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <ChevronsUpDown className="h-4 w-4" />
                        <span className="sr-only">Toggle</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-4 px-4 py-2 sm:max-h-44 max-h-80  overflow-y-auto">
                    {[1, 2, 3, 4].map((relay) => (
                      <div
                        key={relay}
                        className="grid gap-2 border p-4 rounded-lg"
                      >
                        <Label>Relay {relay}</Label>
                        {mode === "SWITCH" ||
                        mode === "SRS" ||
                        mode === "SST" ? (
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="Seconds"
                              min="0"
                            />
                            <Input
                              type="number"
                              placeholder="Minutes"
                              min="0"
                            />
                            <Input type="number" placeholder="Hours" min="0" />
                          </div>
                        ) : mode === "TTR" ? (
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="Hour (24h)"
                              min="0"
                              max="23"
                            />
                            <Input
                              type="number"
                              placeholder="Minute"
                              min="0"
                              max="59"
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {(mode === "SRS" || mode === "SST") && (
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="Enter city name"
                    required
                  />
                </div>
              )}

              <Button type="submit" className="w-full">
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
