'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React, { useState } from 'react'
import { MQTTFormData, TriggerMode } from '@/app/types'
import { toast } from 'sonner'

export function UserForm () {
  const [mode, setMode] = useState<string | undefined>(Object.keys(TriggerMode)[0])
  const [formData, setFormData] = useState<MQTTFormData>({
    key: '',
    devId: '',
    city: '',
    relays: [0, 0, 0, 0],
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const { id, value } = e.target
    if (index !== undefined) {
      setFormData((prev) => {
        const newRelays = [...prev.relays]
        newRelays[index] = Number(value)
        return { ...prev, relays: newRelays }
      })
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }))
    }
  }

  const validateFormData = (formData: MQTTFormData): boolean => {
    if (!mode) {
      toast.error('Please select a trigger mode', { position: 'top-right' })
      return false
    }

    const { key, devId, city, relays } = formData

    if (!key.trim() || !devId.trim()) {
      toast.error('Please fill in the key and device ID', { position: 'top-right' })
      return false
    }

    if ((mode === 'SRS' || mode === 'SST') && !city.trim()) {
      toast.error('Please fill in the city name', { position: 'top-right' })
      return false
    }

    if (relays.some((relay) => relay < 0)) {
      toast.error('Relay values must be positive', { position: 'top-right' })
      return false
    }

    if (relays.every((relay) => relay === 0)) {
      toast.error('Please fill in at least one relay value', { position: 'top-right' })
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateFormData(formData)) return
    const response = await fetch('/api/mqtt-message', { method: 'POST', body: JSON.stringify(formData) })
    if (response.ok) {
      toast.success('Data saved successfully', { position: 'top-right' })
    } else {
      toast.error('Failed to save data', { position: 'top-right' })
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto sm:p-0 p-4 h-[99vh] overflow-hidden">
      <Card className="shadow-lg rounded-xl border flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">MQTT Scheduler</CardTitle>
          <CardDescription className="text-gray-600">
            Configure triggers and schedules for your devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <form className="h-max flex flex-col" onSubmit={handleSubmit}>
            <div className="grid gap-4 p-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="key">Key/Code</Label>
                <Input id="key" type="text" placeholder="Enter the key value" required
                       className="rounded-lg border-gray-300" onChange={handleChange}/>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="devId">Device ID</Label>
                <Input id="devId" type="text" placeholder="Enter your device ID" required
                       className="rounded-lg border-gray-300" onChange={handleChange}/>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Trigger Mode</Label>
                <Select onValueChange={(value) => setMode(value)} defaultValue={mode}>
                  <SelectTrigger className="rounded-lg border-gray-300">
                    <SelectValue placeholder="Select Mode"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Trigger/Schedule Mode</SelectLabel>
                      {Object.entries(TriggerMode).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {mode && (
                <div className="grid gap-4 p-4 border rounded-lg bg-gray-50">
                  <Label>Relay Configuration</Label>
                  {[1, 2, 3, 4].map((relay, index) => (
                    <div key={relay} className="grid gap-2">
                      <Label>Relay {relay}</Label>
                      {(mode === 'SWITCH' || mode === 'SRS' || mode === 'SST') ? (
                        <Input type="number" placeholder="Seconds" min="0" className="rounded-lg border-gray-300"
                               onChange={(e) => handleChange(e, index)}/>
                      ) : mode === 'TTR' ? (
                        <div className="flex gap-2">
                          <Input type="number" placeholder="Hour (24h)" min="0" max="23"
                                 className="rounded-lg border-gray-300"/>
                          <Input type="number" placeholder="Minute" min="0" max="59"
                                 className="rounded-lg border-gray-300"/>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
              {(mode === 'SRS' || mode === 'SST') && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" type="text" placeholder="Enter city name" required
                         className="rounded-lg border-gray-300" onChange={handleChange}/>
                </div>
              )}
              <Button type="submit" className="w-full rounded-lg text-white bg-blue-500 hover:bg-blue-600">
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
