import type { TreemapNode } from '../types/quant';

/**
 * Squarified Treemap Algoritması (Bruls, Huizing, van Wijk)
 * Dikdörtgen en-boy oranını ~1.0 (kare) seviyesinde tutarak Finviz / S&P 500 benzeri taşmasız ısı haritası üretir.
 */
export class SquarifiedTreemapEngine {
  public static layout(
    nodes: TreemapNode[],
    width: number,
    height: number
  ): TreemapNode[] {
    if (!nodes || nodes.length === 0 || width <= 0 || height <= 0) return [];

    const sortedNodes = [...nodes]
      .filter(n => n.value > 0)
      .sort((a, b) => b.value - a.value);

    const totalValue = sortedNodes.reduce((sum, n) => sum + n.value, 0);
    if (totalValue <= 0) return [];

    const totalArea = width * height;
    const items = sortedNodes.map(node => ({
      ...node,
      area: (node.value / totalValue) * totalArea
    }));

    const result: TreemapNode[] = [];
    this.squarify(items, [], { x: 0, y: 0, dx: width, dy: height }, result);
    return result;
  }

  private static squarify(
    children: Array<TreemapNode & { area: number }>,
    row: Array<TreemapNode & { area: number }>,
    rect: { x: number; y: number; dx: number; dy: number },
    result: TreemapNode[]
  ): void {
    if (children.length === 0) {
      if (row.length > 0) {
        this.layoutRow(row, rect, result);
      }
      return;
    }

    const c = children[0];
    const newRow = [...row, c];

    if (row.length === 0 || this.worst(row, rect) >= this.worst(newRow, rect)) {
      this.squarify(children.slice(1), newRow, rect, result);
    } else {
      const remainingRect = this.layoutRow(row, rect, result);
      this.squarify(children, [], remainingRect, result);
    }
  }

  private static worst(
    row: Array<TreemapNode & { area: number }>,
    rect: { x: number; y: number; dx: number; dy: number }
  ): number {
    if (row.length === 0) return Infinity;
    const w = Math.min(rect.dx, rect.dy);
    const sumArea = row.reduce((s, item) => s + item.area, 0);
    const minArea = Math.min(...row.map(i => i.area));
    const maxArea = Math.max(...row.map(i => i.area));
    const wSq = w * w;

    return Math.max(
      (wSq * maxArea) / (sumArea * sumArea),
      (sumArea * sumArea) / (wSq * minArea)
    );
  }

  private static layoutRow(
    row: Array<TreemapNode & { area: number }>,
    rect: { x: number; y: number; dx: number; dy: number },
    result: TreemapNode[]
  ): { x: number; y: number; dx: number; dy: number } {
    const sumArea = row.reduce((s, item) => s + item.area, 0);
    const isHorizontal = rect.dx >= rect.dy;

    if (isHorizontal) {
      const rowWidth = sumArea / rect.dy;
      let currentY = rect.y;

      row.forEach(item => {
        const itemHeight = item.area / rowWidth;
        result.push({
          ...item,
          x0: Math.round(rect.x),
          y0: Math.round(currentY),
          x1: Math.round(rect.x + rowWidth),
          y1: Math.round(currentY + itemHeight)
        });
        currentY += itemHeight;
      });

      return {
        x: rect.x + rowWidth,
        y: rect.y,
        dx: Math.max(0, rect.dx - rowWidth),
        dy: rect.dy
      };
    } else {
      const rowHeight = sumArea / rect.dx;
      let currentX = rect.x;

      row.forEach(item => {
        const itemWidth = item.area / rowHeight;
        result.push({
          ...item,
          x0: Math.round(currentX),
          y0: Math.round(rect.y),
          x1: Math.round(currentX + itemWidth),
          y1: Math.round(rect.y + rowHeight)
        });
        currentX += itemWidth;
      });

      return {
        x: rect.x,
        y: rect.y + rowHeight,
        dx: rect.dx,
        dy: Math.max(0, rect.dy - rowHeight)
      };
    }
  }
}
