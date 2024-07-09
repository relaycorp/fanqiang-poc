declare module 'src/types/tun-wrapper.js' {
    export function tunAlloc(dev: string, fd: number): number;
}
