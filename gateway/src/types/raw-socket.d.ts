declare module 'raw-socket' {
    export const SocketLevel: {
        SOL_SOCKET: number;
        IPPROTO_IP: number;
        IPPROTO_IPV6: number;
    };

    export const SocketOption: {
        SO_BROADCAST: number;
        SO_RCVBUF: number;
        SO_RCVTIMEO: number;
        SO_SNDBUF: number;
        SO_SNDTIMEO: number;
        IP_HDRINCL: number;
        IP_OPTIONS: number;
        IP_TOS: number;
        IP_TTL: number;
        IPV6_TTL: number;
        IPV6_UNICAST_HOPS: number;
        IPV6_V6ONLY: number;
        // Platform-specific options
        SO_BINDTODEVICE?: number; // Linux only
        IPV6_HDRINCL?: number; // Windows only
    };

    export const AddressFamily: {
        IPv4: number;
        IPv6: number;
    };

    export const Protocol: {
        None: number;
        ICMP: number;
        TCP: number;
        UDP: number;
        ICMPv6: number;
    };

    export interface SocketOptions {
        addressFamily?: number;
        protocol?: number;
        bufferSize?: number;
        generateChecksums?: boolean;
        checksumOffset?: number;
    }

    type SendCallback = (error: Error | null, bytes: number) => void;

    export class Socket extends EventEmitter {
        constructor(options?: SocketOptions);

        close(): this;
        getOption(level: number, option: number, buffer: Buffer, length: number): number;
        pauseRecv(): this;
        pauseSend(): this;
        resumeRecv(): this;
        resumeSend(): this;
        send(
            buffer: Buffer,
            offset: number,
            length: number,
            address: string,
            beforeCallback?: SendCallback,
            afterCallback?: SendCallback
        ): this;
        setOption(level: number, option: number, value: number | Buffer, length?: number): void;

        on(event: 'close', listener: () => void): this;
        on(event: 'error', listener: (error: Error) => void): this;
        on(event: 'message', listener: (buffer: Buffer, source: string) => void): this;
    }

    export function createSocket(options?: SocketOptions): Socket;
    export function createChecksum(bufferOrObject: Buffer | ChecksumObject, ...args: (Buffer | ChecksumObject)[]): number;
    export function writeChecksum(buffer: Buffer, offset: number, checksum: number): Buffer;
    export function htonl(uint32: number): number;
    export function htons(uint16: number): number;
    export function ntohl(uint32: number): number;
    export function ntohs(uint16: number): number;
}

interface ChecksumObject {
    buffer: Buffer;
    offset: number;
    length: number;
}
