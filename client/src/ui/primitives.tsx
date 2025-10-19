/**
 * Layout primitives that consume design tokens via CSS variables
 * Use these components to maintain brand consistency across the app
 */

export interface ContainerProps {
  max?: number;
  children: React.ReactNode;
}

export const Container: React.FC<ContainerProps> = ({ max = 1200, children }) => (
  <div
    style={{
      margin: "0 auto",
      maxWidth: max,
      padding: "0 var(--space-2)",
    }}
  >
    {children}
  </div>
);

export interface StackProps {
  gap?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
}

export const Stack: React.FC<StackProps> = ({ gap = 2, children }) => (
  <div
    style={{
      display: "grid",
      gap: `var(--space-${gap})`,
    }}
  >
    {children}
  </div>
);

export interface GridProps {
  cols?: number;
  gap?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
}

export const Grid: React.FC<GridProps> = ({ cols = 12, gap = 2, children }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: `var(--space-${gap})`,
    }}
  >
    {children}
  </div>
);

export interface CardProps {
  pad?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  pad = 2,
  children,
  className = "",
  style = {},
}) => (
  <div
    className={className}
    style={{
      background: "var(--color-surface)",
      borderRadius: "var(--radius-xl)",
      padding: `var(--space-${pad})`,
      boxShadow: "var(--shadow-md)",
      ...style,
    }}
  >
    {children}
  </div>
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  children,
  style,
  ...rest
}) => {
  const baseStyle: React.CSSProperties = {
    border: "none",
    borderRadius: "var(--radius-lg)",
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "var(--shadow-sm)",
    transition: "all var(--duration-sm) var(--easing)",
  };

  const variantStyle: React.CSSProperties =
    variant === "primary"
      ? {
          background: "var(--color-primary)",
          color: "var(--color-on-primary)",
        }
      : {
          background: "var(--color-surface)",
          color: "var(--color-text)",
        };

  return (
    <button {...rest} style={{ ...baseStyle, ...variantStyle, ...style }}>
      {children}
    </button>
  );
};
