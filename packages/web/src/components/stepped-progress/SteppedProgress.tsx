import { Fragment, forwardRef, useEffect, useRef, useState } from 'react'

import { Box, Flex, IconComponent, Text, Divider } from '@audius/harmony'

import styles from './SteppedProgress.module.css'

type StepProps = {
  icon: IconComponent
  label: string
  isActive: boolean
}

const Step = forwardRef<HTMLDivElement, StepProps>(
  (
    {
      icon: Icon,
      label,
      isActive
    }: {
      icon: IconComponent
      label: string
      isActive: boolean
    },
    ref
  ) => {
    return (
      <Flex ref={ref} gap='xs' ph='s' pv='m' alignItems='center'>
        <Icon size='l' color={isActive ? 'default' : 'subdued'} />
        <Text
          variant='label'
          size='m'
          color={isActive ? 'default' : 'subdued'}
          strength='strong'
        >
          {label}
        </Text>
      </Flex>
    )
  }
)

type StepData = {
  key: string
  label: string
  icon: IconComponent
}

type SteppedProgressProps = {
  steps: StepData[]
  activeStep: string
}

export const SteppedProgress = ({
  steps,
  activeStep
}: SteppedProgressProps) => {
  const stepsRef = useRef<HTMLDivElement[]>([])
  const [stepUnderlineWidth, setStepUnderlineWidth] = useState(0)
  const [stepUnderlineLeft, setStepUnderlineLeft] = useState(0)
  useEffect(() => {
    function setTabPosition() {
      const currentTab =
        stepsRef.current[steps.findIndex((s) => s.key === activeStep)]
      setStepUnderlineLeft(currentTab?.offsetLeft ?? 0)
      setStepUnderlineWidth(currentTab?.clientWidth ?? 0)
    }

    setTabPosition()
    window.addEventListener('resize', setTabPosition)

    return () => window.removeEventListener('resize', setTabPosition)
  }, [activeStep, steps])
  return (
    <Box>
      <Flex alignItems='center' gap='s'>
        {steps.map((s, i) => (
          <Fragment key={s.key}>
            <Step
              ref={(el) => {
                if (el) {
                  stepsRef.current[i] = el
                }
              }}
              icon={s.icon}
              label={s.label}
              isActive={activeStep === s.key}
            />
            {i !== steps.length - 1 ? (
              <Divider className={styles.connector} color='strong' />
            ) : null}
          </Fragment>
        ))}
      </Flex>
      <span
        className={styles.underline}
        css={{ left: stepUnderlineLeft, width: stepUnderlineWidth, zIndex: 1 }}
      />
    </Box>
  )
}
