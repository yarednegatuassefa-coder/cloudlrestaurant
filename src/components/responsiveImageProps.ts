type ResponsiveImageAttributes = {
  srcSet?: string;
  sizes?: string;
};

export function responsiveImageProps(
  src: string,
  widths: readonly number[],
  sizes: string,
): ResponsiveImageAttributes {
  if (!src.startsWith("/assets/") || !/\.(?:webp|jpe?g|png)$/i.test(src) || widths.length === 0) {
    return {};
  }

  const base = src.replace(/\.(?:webp|jpe?g|png)$/i, "");
  const candidates = [...new Set(widths)]
    .filter((width) => Number.isInteger(width) && width > 0)
    .sort((left, right) => left - right)
    .map((width) => `${base}-${width}.webp ${width}w`);

  return candidates.length > 0 ? { srcSet: candidates.join(", "), sizes } : {};
}
