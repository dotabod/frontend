'use client'

import { Check } from 'lucide-react'
import type * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StepperProps {
  steps: { title: string; content: React.ReactNode }[]
  currentStep: number
  onChange: (step: number) => void
}

export function Stepper({ steps, currentStep, onChange }: StepperProps) {
  return (
    <div className="w-full">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={cn(
              'flex items-center',
              index !== steps.length - 1 && 'w-full'
            )}
          >
            <Button
              variant={currentStep >= index ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'rounded-full',
                currentStep > index && 'bg-primary text-primary-foreground',
                currentStep === index && 'border-primary'
              )}
              onClick={() => onChange(index)}
            >
              {currentStep > index ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{index + 1}</span>
              )}
              <span className="sr-only">{step.title}</span>
            </Button>
            {index !== steps.length - 1 && (
              <div
                className={cn(
                  'w-full h-0.5 mx-2',
                  currentStep > index ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </li>
        ))}
      </ol>
      <div className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className={cn(
              'transition-opacity',
              currentStep === index ? 'opacity-100' : 'opacity-0 hidden'
            )}
          >
            <h3 className="text-lg font-medium">{step.title}</h3>
            {step.content}
          </div>
        ))}
      </div>
    </div>
  )
}
