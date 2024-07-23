import { TunInterface } from './TunInterface.js';

export class TunInterfacePool {
  private unallocatedInterfaces: number[];

  constructor(maxInterfaces: number) {
    // Initialize the pool with all possible interface IDs
    this.unallocatedInterfaces = Array.from(
      { length: maxInterfaces },
      (_, i) => i,
    );
  }

  async allocateInterface(): Promise<TunInterface> {
    if (this.unallocatedInterfaces.length === 0) {
      throw new Error('Maximum number of TUN interfaces reached');
    }

    const id = this.unallocatedInterfaces.shift()!;
    let tunInterface: TunInterface;
    try {
      tunInterface = await TunInterface.open(id);
    } catch (err) {
      // Put the ID back in the pool if opening fails
      this.unallocatedInterfaces.unshift(id);
      throw new Error(`Failed to open TUN interface ${id}`, {
        cause: err,
      });
    }

    return tunInterface;
  }

  releaseInterface(tunInterface: TunInterface): void {
    if (this.unallocatedInterfaces.includes(tunInterface.id)) {
      throw new Error(
        `TUN interface ${tunInterface.id} is already unallocated`,
      );
    }

    this.unallocatedInterfaces.push(tunInterface.id);
  }
}
