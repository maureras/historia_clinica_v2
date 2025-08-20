// src/modules/padecimientos/index.ts
export { PadecimientosController } from './padecimientos.controller.js';
export { PadecimientosService } from './padecimientos.service.js';
export { routerPadecimientos } from './padecimientos.routes.js';
export { 
  PadecimientoSchema, 
  PadecimientoUpdateSchema, 
  BuscarPadecimientosSchema,
  type PadecimientoDTO,
  type PadecimientoUpdateDTO,
  type BuscarPadecimientosDTO
} from './padecimiento.schema.js';
export type {
  CreatePadecimientoDTO,
  UpdatePadecimientoDTO,
  BuscarPadecimientosParams
} from './padecimientos.service.js';