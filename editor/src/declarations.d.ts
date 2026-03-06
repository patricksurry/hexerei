declare module '@hexmap/renderer' {
    import { MeshMap } from '@hexmap/core';

    export interface RendererConfig {
        element: HTMLElement;
        width: number;
        height: number;
        hexSize: number;
        origin?: { x: number, y: number };
    }

    export class HexRenderer {
        constructor(mesh: MeshMap, config: RendererConfig);
        highlight(hexIds: string[]): void;
        update(mesh: MeshMap): void;
    }
}
