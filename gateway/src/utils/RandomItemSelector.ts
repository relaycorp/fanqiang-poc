const MAX_TOTAL_WEIGHT = 255;

export class RandomItemSelector<Item> {
  private readonly maxValueByItem: Map<Item, number>;

  constructor(itemWeights: Map<Item, number>) {
    itemWeights.forEach((weight) => {
      if (!Number.isInteger(weight) || weight < 0) {
        throw new Error(`Weights must be positive integers (got ${weight})`);
      }
    });

    const totalWeight = Array.from(itemWeights.values()).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    if (MAX_TOTAL_WEIGHT < totalWeight) {
      throw new Error(`Total weight cannot exceed ${MAX_TOTAL_WEIGHT}`);
    }

    this.maxValueByItem = new Map();
    let cumulativeWeight = 0;
    for (const [item, weight] of itemWeights) {
      cumulativeWeight += weight;
      const maxValue = Math.floor(
        (cumulativeWeight / totalWeight) * MAX_TOTAL_WEIGHT,
      );
      this.maxValueByItem.set(item, maxValue);
    }
  }

  select(): Item {
    const view = new Uint8Array(1);
    crypto.getRandomValues(view);
    const randomValue = view[0];

    for (const [item, maxValue] of this.maxValueByItem) {
      if (randomValue <= maxValue) {
        return item;
      }
    }

    // This should never happen, but TypeScript requires a return statement
    throw new Error('Failed to select an option');
  }
}
