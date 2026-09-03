export default function Logo({ size = 26 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/logo-mark.png"
      alt="Horosphère"
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: '50%' }}
    />
  );
}
