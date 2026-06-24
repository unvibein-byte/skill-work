import appLogo from '../assets/skillapplogo.png';

const AppLogo = ({
  size = 48,
  rounded = 16,
  withBackground = false,
  withGlow = false,
  alt = '24hrwork',
  style = {},
  className = '',
}) => {
  const image = (
    <img
      src={appLogo}
      alt={alt}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        borderRadius: rounded,
        display: 'block',
        ...style,
      }}
    />
  );

  if (!withBackground) return image;

  const padding = Math.round(size * 0.22);

  return (
    <div
      style={{
        background: 'var(--accent-gradient)',
        padding,
        borderRadius: Math.round(rounded * 1.5),
        boxShadow: withGlow ? '0 8px 32px rgba(99, 102, 241, 0.4)' : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img
        src={appLogo}
        alt={alt}
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          borderRadius: rounded,
          display: 'block',
          ...style,
        }}
      />
    </div>
  );
};

export default AppLogo;
