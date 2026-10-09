// Shared dimensions of the GM building (owner: edificio agent). 1 = 1 m. Facade at z = 0, building goes back to z = -D.
export const XL = -11, XR = 11;       // building spans x -11..11 (22 m)
export const D = 7;                    // depth (z from -7 to 0)
export const WALL = 0.3;               // facade thickness (z -0.3..0)
export const SLAB = 0.25;              // floor slab thickness
export const H = 3.1;                  // storey height (floor to floor)
// floor-top height of storey s: -1 basement, 0 ground, 1..5 homes, 6 = roof deck / attic floor
export const Y = (s) => 0.25 + H * s;
export const CEIL = (s) => Y(s + 1) - SLAB;     // underside of the ceiling slab of storey s
export const ROOF = Y(6);                        // 18.85: roof deck / attic floor
export const CORE = { x0: -2.5, x1: 2.5 };       // stairwell + lift core, centred
export const ATTIC = { front: -2, ridge: -4.5, back: -7, kneeH: 1.1, ridgeH: 3.6 };  // pitched roof, 45 degrees
export const LIFT = { x0: 1.0, x1: 2.4, z0: -3.7, z1: -2.0 };                       // lift shaft (cabin opens towards +z when cutaway)
export const STAIR = { x0: -1.7, x1: 0.9, z0: -1.75, z1: -0.45 };                    // stair flights, front strip
export const TAU = 20;                                                              // loop length of every movement (s)
