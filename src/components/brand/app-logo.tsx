import Image from "next/image"

import { APP_LOGO_SRC, APP_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"

type AppLogoProps = {
  className?: string
  size?: number
  priority?: boolean
}

export function AppLogo({
  className,
  size = 32,
  priority = false,
}: AppLogoProps) {
  return (
    <Image
      src={APP_LOGO_SRC}
      alt={APP_NAME}
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-full object-cover", className)}
    />
  )
}
