"use client"

import { Button } from "@geist-ui/core"
import { Tooltip } from "@mantine/core"
import { Power } from "lucide-react"

export const DisableButton = ({
  tooltip = "Oops! Can't turn off right now. This feature is always on for the beta. Expect to be able to turn this off soon!",
}) => (
  <Tooltip multiline width={220} label={tooltip} withArrow position="right">
    <Button icon={<Power />} type="secondary">
      Turn off
    </Button>
  </Tooltip>
)
