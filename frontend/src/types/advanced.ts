import React from "react";

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ApiError = {
  message: string;
  code?: string;
  details?: any;
  status?: number;
};

export type Result<T, E = ApiError> =
  | { success: true; data: T }
  | { success: false; error: E };

export type AsyncResult<T, E = ApiError> = Promise<Result<T, E>>;

export type PartialRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type EnumValues<T> = T[keyof T];

export type FunctionParams<T> = T extends (...args: infer P) => any ? P : never;

export type FunctionReturn<T> = T extends (...args: any[]) => infer R
  ? R
  : never;

export type ComponentProps<T> = T extends React.ComponentType<infer P>
  ? P
  : never;

export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

export type PromiseType<T> = T extends Promise<infer U> ? U : never;

export type UnionFromIntersection<T> = (
  T extends any ? (k: T) => void : never
) extends (k: infer U) => void
  ? U
  : never;

export type ObjectKeys<T> = T extends object ? keyof T : never;

export type ObjectValues<T> = T extends object ? T[keyof T] : never;

export type NestedKeys<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? `${string & K}.${string & NestedKeys<T[K], Prev[D]>}`
        : K;
    }[keyof T]
  : never;

export type NestedPaths<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? `${string & K}.${string & NestedPaths<T[K], Prev[D]>}`
        : K;
    }[keyof T]
  : never;

export type NestedValues<T, P extends string, D extends number = 3> = [
  D
] extends [never]
  ? never
  : P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends string
      ? NestedValues<T[K], Rest, Prev[D]>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never;

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export type ApiEndpoint<T> = T extends { query: infer Q; mutation: infer M }
  ? { query: Q; mutation: M }
  : never;

export type QueryResult<T> = T extends {
  data: infer D;
  error: infer E;
  isLoading: boolean;
}
  ? { data: D; error: E; isLoading: boolean }
  : never;

export type MutationResult<T> = T extends {
  mutate: infer M;
  isLoading: boolean;
  error: infer E;
}
  ? { mutate: M; isLoading: boolean; error: E }
  : never;

export type SliceActions<T> = T extends { actions: infer A } ? A : never;

export type SliceState<T> = T extends { initialState: infer S } ? S : never;

export type ReducerType<T> = T extends { reducer: infer R } ? R : never;

export type MiddlewareType<T> = T extends { middleware: infer M } ? M : never;

export type StoreType<T> = T extends {
  getState: () => infer S;
  dispatch: infer D;
}
  ? { state: S; dispatch: D }
  : never;

export type ComponentType<T> = T extends React.ComponentType<infer P>
  ? P
  : never;

export type HookType<T> = T extends (...args: any[]) => infer R ? R : never;

export type ContextType<T> = T extends React.Context<infer C> ? C : never;

export type RefType<T> = T extends React.RefObject<infer R> ? R : never;

export type EventType<T> = T extends React.ChangeEvent<infer E> ? E : never;

export type FormEventType<T> = T extends React.FormEvent<infer E> ? E : never;

export type KeyboardEventType<T> = T extends React.KeyboardEvent<infer E>
  ? E
  : never;

export type MouseEventType<T> = T extends React.MouseEvent<infer E> ? E : never;

export type TouchEventType<T> = T extends React.TouchEvent<infer E> ? E : never;

export type WheelEventType<T> = T extends React.WheelEvent<infer E> ? E : never;

export type DragEventType<T> = T extends React.DragEvent<infer E> ? E : never;

export type FocusEventType<T> = T extends React.FocusEvent<infer E> ? E : never;

export type ClipboardEventType<T> = T extends React.ClipboardEvent<infer E>
  ? E
  : never;

export type CompositionEventType<T> = T extends React.CompositionEvent<infer E>
  ? E
  : never;

export type AnimationEventType<T> = T extends React.AnimationEvent<infer E>
  ? E
  : never;

export type TransitionEventType<T> = T extends React.TransitionEvent<infer E>
  ? E
  : never;

export type SyntheticEventType<T> = T extends React.SyntheticEvent<infer E>
  ? E
  : never;

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type NonNullable<T> = T extends null | undefined ? never : T;

export type LiteralType<T> = T extends string | number | boolean ? T : never;

export type LiteralUnion<T> = T | (string & {});

export type Branded<T, B> = T & { __brand: B };

export type ReadonlyArray<T> = readonly T[];

export type MutableArray<T> = T[];

export type Tuple<T, L extends number> = T[] & { length: L };

export type ReadonlyTuple<T, L extends number> = readonly T[] & {
  readonly length: L;
};

export type FunctionWithParams<T, P extends any[]> = (...args: P) => T;

export type AsyncFunction<T> = (...args: any[]) => Promise<T>;

export type Constructor<T> = new (...args: any[]) => T;

export type InstanceType<T> = T extends Constructor<infer I> ? I : never;

export type MethodNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

export type PropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

export type RequiredProperties<T> = {
  [K in keyof T]-?: T[K];
};

export type OptionalProperties<T> = {
  [K in keyof T]?: T[K];
};

export type ReadonlyProperties<T> = {
  readonly [K in keyof T]: T[K];
};

export type MutableProperties<T> = {
  -readonly [K in keyof T]: T[K];
};
