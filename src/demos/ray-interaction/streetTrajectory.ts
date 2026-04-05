import * as THREE from "three";

const ROAD_TILE_PREFIX = "road_tile_";

/** 路块中心距小于此值视为邻接（1×1 网格边相邻约 1，略放大容误差） */
const DEFAULT_ADJ_THRESHOLD = 1.18;

/** Catmull-Rom 弧长表精度 */
const ARC_LENGTH_DIVISIONS = 2048;

export type RoadTrajectory = {
  readonly totalLength: number;
  /** s 按总弧长取模；写入 pos、tangent（tangent 已投影到 XZ 并归一化） */
  sampleAtDistance(s: number, pos: THREE.Vector3, tangent: THREE.Vector3): void;
};

function collectRoadTileCenters(root: THREE.Object3D): THREE.Vector3[] {
  const centers: THREE.Vector3[] = [];
  const box = new THREE.Box3();
  const c = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    if (!mesh.name.startsWith(ROAD_TILE_PREFIX)) return;
    box.setFromObject(mesh);
    if (!box.isEmpty()) {
      box.getCenter(c);
      centers.push(c.clone());
    }
  });
  return centers;
}

function buildAdjacency(n: number, centers: THREE.Vector3[], th: number): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  const th2 = th * th;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (centers[i].distanceToSquared(centers[j]) <= th2) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }
  return adj;
}

function largestComponent(adj: number[][]): number[] {
  const n = adj.length;
  const seen = new Uint8Array(n);
  let best: number[] = [];

  for (let s = 0; s < n; s++) {
    if (seen[s]) continue;
    const comp: number[] = [];
    const q = [s];
    seen[s] = 1;
    while (q.length) {
      const u = q.pop()!;
      comp.push(u);
      for (const v of adj[u]) {
        if (!seen[v]) {
          seen[v] = 1;
          q.push(v);
        }
      }
    }
    if (comp.length > best.length) best = comp;
  }
  return best;
}

/** Prim（局部下标 0..m-1），返回 parent，根 parent=-1 */
function primMST(
  m: number,
  comp: readonly number[],
  centers: THREE.Vector3[],
  adjGlobal: number[][],
  localOfGlobal: Map<number, number>,
  startLocal: number,
): Int32Array {
  const dist = new Float64Array(m).fill(Infinity);
  const parent = new Int32Array(m).fill(-1);
  const used = new Uint8Array(m);
  const globalOf = (li: number) => comp[li];

  const edgeLen = (a: number, b: number) =>
    centers[globalOf(a)].distanceTo(centers[globalOf(b)]);

  dist[startLocal] = 0;

  for (let it = 0; it < m; it++) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < m; i++) {
      if (!used[i] && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u < 0) break;
    used[u] = 1;
    const gu = globalOf(u);
    for (const gv of adjGlobal[gu]) {
      const v = localOfGlobal.get(gv);
      if (v === undefined || used[v]) continue;
      const w = edgeLen(u, v);
      if (w < dist[v]) {
        dist[v] = w;
        parent[v] = u;
      }
    }
  }

  return parent;
}

function buildUndirectedTreeAdj(m: number, parent: Int32Array): number[][] {
  const treeAdj: number[][] = Array.from({ length: m }, () => []);
  for (let v = 0; v < m; v++) {
    const p = parent[v];
    if (p >= 0) {
      treeAdj[v].push(p);
      treeAdj[p].push(v);
    }
  }
  return treeAdj;
}

function eulerTour(u: number, p: number, treeAdj: number[][], out: number[]): void {
  out.push(u);
  for (const v of treeAdj[u]) {
    if (v === p) continue;
    eulerTour(v, u, treeAdj, out);
    out.push(u);
  }
}

function pathFromEuler(
  euler: readonly number[],
  comp: readonly number[],
  centers: readonly THREE.Vector3[],
): THREE.Vector3[] {
  const path: THREE.Vector3[] = [];
  const eps2 = 1e-8;
  for (const li of euler) {
    const p = centers[comp[li]];
    if (path.length > 0 && path[path.length - 1].distanceToSquared(p) < eps2) continue;
    path.push(p.clone());
  }
  return path;
}

/**
 * 从城市根节点遍历 `road_tile_*` 路面，在最大连通块上建 MST，欧拉遍历得到沿街道的连续控制点，
 * 再套 Catmull-Rom + 弧长参数化，供车辆位置与切线使用。
 */
export function buildRoadTrajectory(
  cityRoot: THREE.Object3D,
  options?: {
    spawnHint?: THREE.Vector3;
    adjacencyThreshold?: number;
  },
): RoadTrajectory | null {
  const th = options?.adjacencyThreshold ?? DEFAULT_ADJ_THRESHOLD;
  const spawn = options?.spawnHint ?? new THREE.Vector3(0, 0, -12);

  const centers = collectRoadTileCenters(cityRoot);
  if (centers.length < 2) return null;

  const adj = buildAdjacency(centers.length, centers, th);
  const comp = largestComponent(adj);
  if (comp.length < 2) return null;

  const m = comp.length;
  const localOfGlobal = new Map<number, number>();
  for (let i = 0; i < m; i++) localOfGlobal.set(comp[i], i);

  let startLocal = 0;
  let bestD = Infinity;
  const sx = spawn.x;
  const sz = spawn.z;
  for (let i = 0; i < m; i++) {
    const p = centers[comp[i]];
    const d = (p.x - sx) * (p.x - sx) + (p.z - sz) * (p.z - sz);
    if (d < bestD) {
      bestD = d;
      startLocal = i;
    }
  }

  const parent = primMST(m, comp, centers, adj, localOfGlobal, startLocal);
  const treeAdj = buildUndirectedTreeAdj(m, parent);
  const euler: number[] = [];
  eulerTour(startLocal, -1, treeAdj, euler);

  const path = pathFromEuler(euler, comp, centers);
  if (path.length < 2) return null;

  const curve = new THREE.CatmullRomCurve3(path, false, "centripetal", 0.5);
  curve.arcLengthDivisions = ARC_LENGTH_DIVISIONS;
  curve.updateArcLengths();

  const totalLength = curve.getLength();
  if (totalLength < 1e-4) return null;

  const posTmp = new THREE.Vector3();
  const tanTmp = new THREE.Vector3();

  return {
    totalLength,
    sampleAtDistance(s: number, pos: THREE.Vector3, tangent: THREE.Vector3): void {
      let u = (s % totalLength) / totalLength;
      if (u < 0) u += 1;
      curve.getPointAt(u, posTmp);
      curve.getTangentAt(u, tanTmp);
      tanTmp.y = 0;
      if (tanTmp.lengthSq() < 1e-10) tanTmp.set(0, 0, 1);
      else tanTmp.normalize();
      pos.copy(posTmp);
      tangent.copy(tanTmp);
    },
  };
}
