declare module "pngjs" {
  export class PNG {
    constructor(options?: { width?: number; height?: number; fill?: boolean })
    width: number
    height: number
    data: Buffer | null
    static sync: {
      write(png: PNG, options?: object): Buffer
      read(buffer: Buffer, options?: object): PNG
    }
  }
}
