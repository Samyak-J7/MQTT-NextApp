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
import React, { useEffect, useState } from 'react'
import { FormData, MqttMessagePayload, TriggerMode } from '@/app/types'
import { toast } from 'sonner'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from '@/components/ui/dialog'
import { ScanIcon } from 'lucide-react'

export function UserForm () {
  const [mode, setMode] = useState<string>(Object.keys(TriggerMode)[0])
  const [formData, setFormData] = useState<FormData>({
    key: '',
    devId: '',
    city: '',
    relays: [0, 0, 0, 0],
    hh: 0,
    mm: 0,
    mode: '',
  })
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    if (isScannerOpen && !scanner) {
      setTimeout(() => {
        const element = document.getElementById('qr-reader')
        if (!element) {
          console.error('qr-reader element not found!')
          return
        }

        const newScanner = new Html5QrcodeScanner('qr-reader', {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        }, false)

        newScanner.render(
          (decodedText) => {
            setFormData((prev) => ({ ...prev, devId: decodedText }))
            setIsScannerOpen(false)
            newScanner.clear().then(() => setScanner(null))
          },
          (errorMessage) => console.log(errorMessage)
        )
        setScanner(newScanner)
      }, 100)
    }

    return () => {scanner?.clear()}
  }, [isScannerOpen, scanner])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const { id, value } = e.target
    if (index !== undefined) {
      setFormData((prev) => {
        const newRelays = [...prev.relays]
        newRelays[index] = Number(value)
        return { ...prev, relays: newRelays, mode }
      })
    } else {
      setFormData((prev) => ({ ...prev, [id]: value, mode }))
    }
  }

  const validateFormData = ({ key, devId, city, relays, hh, mm }: FormData): boolean => {
    if (!mode) return toast.error('Please select a trigger mode', { position: 'top-right' }), false
    if (!key.trim() || !devId.trim()) return toast.error('Please fill in the key and device ID', { position: 'top-right' }), false
    if ((mode === 'SRS' || mode === 'SST') && !city?.trim()) return toast.error('Please fill in the city name', { position: 'top-right' }), false
    if (mode === 'TTR' && (Number(hh) < 1 || Number(hh) > 23 || Number(mm) < 0 || Number(mm) > 59)) return toast.error('Please fill in a valid time', { position: 'top-right' }), false
    if (relays.some(r => r < 0)) return toast.error('Relay values must be positive', { position: 'top-right' }), false
    if (relays.every(r => r === 0)) return toast.error('Please fill in at least one relay value', { position: 'top-right' }), false

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault()
      if (!validateFormData(formData)) return
      const trigAt = mode === 'TTR' ? `${formData.hh.toString().padStart(2, '0')}${formData.mm.toString().padStart(2, '0')}` : (mode === 'SRS' || mode === 'SST' ? formData.city : '0')
      const messagePayload: MqttMessagePayload = {
        key: `*${formData.key}#`,
        devId: formData.devId,
        mode: mode,
        relays: formData.relays,
        trig_at: trigAt,
      }
      const response = await fetch('/api/mqtt-message', { method: 'POST', body: JSON.stringify(messagePayload) })
      if (response.ok) {
        toast.success('Data saved successfully', { position: 'top-right' })
        setFormData({
          key: '',
          devId: '',
          city: '',
          relays: [0, 0, 0, 0],
          hh: 0,
          mm: 0,
          mode: '',
        })
      } else {
        toast.error('Failed to save data', { position: 'top-right' })
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to save data', { position: 'top-right' })
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto sm:p-0 p-4 h-[99vh] overflow-hidden">
      <Card className="shadow-lg rounded-xl border flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">IOT Scheduler</CardTitle>
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
              <div className="relative flex flex-col gap-2">
                <Label htmlFor="devId">Device ID</Label>
                <Input
                  id="devId"
                  type="text"
                  placeholder="Enter your device ID"
                  required
                  className="rounded-lg border-gray-300 pr-10"
                  value={formData.devId}
                  onChange={handleChange}
                />
                <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="absolute right-3 top-2/3 transform -translate-y-1/2 text-gray-500 hover:text-blue-500"
                      onClick={() => setIsScannerOpen(true)}
                    >
                      <ScanIcon className="w-5 h-5"/>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md p-4">
                    <DialogHeader>
                      <DialogTitle>Scan QR Code</DialogTitle>
                    </DialogHeader>
                    <div id="qr-reader" className="w-full"></div>
                  </DialogContent>
                </Dialog>
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
                  <Label>Switch Configuration</Label>
                  {[1, 2, 3, 4].map((relay, index) => (
                    <div key={relay} className="grid gap-2">
                      <Label>Switch {relay}</Label>
                      <Input type="number" placeholder="Seconds" min="0" className="rounded-lg border-gray-300"
                             onChange={(e) => handleChange(e, index)}/>
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
              {mode === 'TTR' && (
                <div className="flex flex-col gap-2">
                  <Label>Time</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input id="hh" type="number" placeholder="Hour (24h)" min="0" max="23"
                           className="rounded-lg border-gray-300" onChange={handleChange}/>
                    <Input id="mm" type="number" placeholder="Minute" min="0" max="59"
                           className="rounded-lg border-gray-300" onChange={handleChange}/>
                  </div>
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
