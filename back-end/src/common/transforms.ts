type TransformArgs = { value: unknown };

export const trim = ({ value }: TransformArgs): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const trimUpper = ({ value }: TransformArgs): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export const toBoolean = ({ value }: TransformArgs): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;
