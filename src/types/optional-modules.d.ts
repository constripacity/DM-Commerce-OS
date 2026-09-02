declare module "picomatch" {
  type Matcher = (value: string) => boolean;
  function picomatch(pattern: string, options?: { dot?: boolean }): Matcher;
  export default picomatch;
}

declare module "istextorbinary" {
  export function isBinary(
    filename: string,
    buffer: Buffer,
    callback: (error: Error | null, result?: boolean) => void,
  ): void;
}
