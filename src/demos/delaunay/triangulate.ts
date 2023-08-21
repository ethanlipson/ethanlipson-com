export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  equals(p: Point): boolean {
    return this.x === p.x && this.y === p.y;
  }
}

export class Edge {
  a: number;
  b: number;

  constructor(a: number, b: number) {
    this.a = a;
    this.b = b;
  }

  equals(other: Edge): boolean {
    return (
      (this.a === other.a && this.b === other.b) ||
      (this.a === other.b && this.b === other.a)
    );
  }
}

export class Triangle {
  a: number;
  b: number;
  c: number;

  edgeAB: Edge;
  edgeAC: Edge;
  edgeBC: Edge;

  area: number;

  constructor(a: number, b: number, c: number, points: (Point | null)[]) {
    this.a = a;
    this.b = b;
    this.c = c;

    this.edgeAB = new Edge(a, b);
    this.edgeAC = new Edge(a, c);
    this.edgeBC = new Edge(b, c);

    this.area = this.calculateArea(points);
  }

  calculateArea(points: (Point | null)[]): number {
    const a = points[this.a]!;
    const b = points[this.b]!;
    const c = points[this.c]!;

    const minor1 = b.x * c.y - b.y * c.x;
    const minor2 = a.x * c.y - a.y * c.x;
    const minor3 = a.x * b.y - a.y * b.x;

    return minor1 - minor2 + minor3;
  }

  containsEdge(edge: Edge): boolean {
    return (
      this.edgeAB.equals(edge) ||
      this.edgeAC.equals(edge) ||
      this.edgeBC.equals(edge)
    );
  }

  containsPoint(p: number): boolean {
    return this.a === p || this.b === p || this.c === p;
  }

  circumcircleContains(pointIndex: number, points: (Point | null)[]): boolean {
    const a = points[this.a]!;
    const b = points[this.b]!;
    const c = points[this.c]!;
    const p = points[pointIndex]!;

    const minor1 = (b.x - p.x) * (c.y - p.y) - (b.y - p.y) * (c.x - p.x);
    const minor2 = (a.x - p.x) * (c.y - p.y) - (a.y - p.y) * (c.x - p.x);
    const minor3 = (a.x - p.x) * (b.y - p.y) - (a.y - p.y) * (b.x - p.x);

    const scalar1 = a.x * a.x - p.x * p.x + (a.y * a.y - p.y * p.y);
    const scalar2 = b.x * b.x - p.x * p.x + (b.y * b.y - p.y * p.y);
    const scalar3 = c.x * c.x - p.x * p.x + (c.y * c.y - p.y * p.y);

    const det = scalar1 * minor1 - scalar2 * minor2 + scalar3 * minor3;
    return this.area * det > 0;
  }
}

export default function triangulate(inputPoints: (Point | null)[]): Triangle[] {
  const points = [
    ...inputPoints,
    new Point(-10000, -10000),
    new Point(10000, -10000),
    new Point(0, 10000),
  ];

  let triangulation = [
    new Triangle(
      inputPoints.length + 0,
      inputPoints.length + 1,
      inputPoints.length + 2,
      points
    ),
  ];

  points.forEach((point, pointIndex) => {
    if (point === null) {
      return;
    }

    const badTriangleIndices: number[] = [];
    triangulation.forEach((triangle, triangleIndex) => {
      if (triangle.circumcircleContains(pointIndex, points)) {
        badTriangleIndices.push(triangleIndex);
      }
    });

    const polygonEdges: Edge[] = [];
    badTriangleIndices.forEach(badTriangleIndex => {
      let edgeABshared: boolean = false;
      let edgeACshared: boolean = false;
      let edgeBCshared: boolean = false;

      badTriangleIndices.forEach(otherBadTriangleIndex => {
        if (badTriangleIndex === otherBadTriangleIndex) {
          return;
        }

        const triangle = triangulation[badTriangleIndex];
        const otherTriangle = triangulation[otherBadTriangleIndex];

        if (!edgeABshared && otherTriangle.containsEdge(triangle.edgeAB)) {
          edgeABshared = true;
        }
        if (!edgeACshared && otherTriangle.containsEdge(triangle.edgeAC)) {
          edgeACshared = true;
        }
        if (!edgeBCshared && otherTriangle.containsEdge(triangle.edgeBC)) {
          edgeBCshared = true;
        }
      });

      if (!edgeABshared) {
        polygonEdges.push(triangulation[badTriangleIndex].edgeAB);
      }
      if (!edgeACshared) {
        polygonEdges.push(triangulation[badTriangleIndex].edgeAC);
      }
      if (!edgeBCshared) {
        polygonEdges.push(triangulation[badTriangleIndex].edgeBC);
      }
    });

    triangulation = triangulation.filter((triangle, triangleIndex) => {
      return !badTriangleIndices.includes(triangleIndex);
    });

    polygonEdges.forEach(edge => {
      triangulation.push(new Triangle(edge.a, edge.b, pointIndex, points));
    });
  });

  triangulation = triangulation.filter(triangle => {
    const superTriangle = new Triangle(
      inputPoints.length + 0,
      inputPoints.length + 1,
      inputPoints.length + 2,
      points
    );

    return (
      !superTriangle.containsPoint(triangle.a) &&
      !superTriangle.containsPoint(triangle.b) &&
      !superTriangle.containsPoint(triangle.c)
    );
  });

  return triangulation;
}
