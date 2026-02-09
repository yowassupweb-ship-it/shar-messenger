'use client'

import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { DeviceType } from '@/types/yandex-wordstat'
import Modal from './Modal'

interface DeviceDropdownProps {
  selectedDevices: DeviceType[]
  onDeviceChange: (devices: DeviceType[]) => void
  disabled?: boolean
}

const deviceOptions = [
  { value: 'all' as DeviceType, label: 'Все устройства' },
  { value: 'desktop' as DeviceType, label: 'Компьютер' },
  { value: 'phone' as DeviceType, label: 'Мобильный' },
  { value: 'tablet' as DeviceType, label: 'Планшет' }
]

export default function DeviceDropdown({ selectedDevices, onDeviceChange, disabled = false }: DeviceDropdownProps) {
  const [showModal, setShowModal] = useState(false)

  const toggleDevice = (device: DeviceType) => {
    if (device === 'all') {
      onDeviceChange(['all'])
    } else {
      const newDevices = selectedDevices.filter(d => d !== 'all')
      if (selectedDevices.includes(device)) {
        const filtered = newDevices.filter(d => d !== device)
        onDeviceChange(filtered.length === 0 ? ['all'] : filtered)
      } else {
        onDeviceChange([...newDevices, device])
      }
    }
  }

  const getDisplayText = () => {
    if (selectedDevices.includes('all') || selectedDevices.length === 0) {
      return 'Все устройства'
    }
    if (selectedDevices.length === 1) {
      const device = deviceOptions.find(d => d.value === selectedDevices[0])
      return device?.label || 'Выберите устройство'
    }
    return `Выбрано: ${selectedDevices.length}`
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="glass-dropdown-button"
        disabled={disabled}
      >
        <span>{getDisplayText()}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {/* Modal */}
    <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
      <div className="glass-card p-6 w-full max-w-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text-primary)' }}>
                Выбор устройств
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-gray-500/20 transition-colors"
                style={{ color: 'var(--glass-text-secondary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {deviceOptions.map((device) => (
                <label key={device.value} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-500/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedDevices.includes(device.value)}
                    onChange={() => toggleDevice(device.value)}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-gray-400 text-blue-500 focus:ring-blue-500 focus:ring-2"
                  />
                  <span style={{ color: 'var(--glass-text-primary)' }}>
                    {device.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="glass-button px-4 py-2"
              >
                Готово
              </button>
            </div>
          </div>
      </Modal>
    </>
  )
}