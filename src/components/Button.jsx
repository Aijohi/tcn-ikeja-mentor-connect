import { forwardRef } from "react";

const variantClasses = {
  primary: "primary-button",
  secondary: "secondary-button",
  tertiary: "tertiary-button",
  danger: "danger-button",
};

const Button = forwardRef(function Button(
  {
    variant = "primary",
    icon: Icon,
    iconPosition = "left",
    className = "",
    children,
    type = "button",
    ...props
  },
  ref,
) {
  const variantClass =
    variantClasses[variant] ??
    variantClasses.primary;

  return (
    <button
      ref={ref}
      type={type}
      className={`${variantClass} ${className}`.trim()}
      {...props}
    >
      {Icon && iconPosition === "left" && (
        <Icon
          size={17}
          aria-hidden="true"
        />
      )}

      <span>{children}</span>

      {Icon && iconPosition === "right" && (
        <Icon
          size={17}
          aria-hidden="true"
        />
      )}
    </button>
  );
});

export default Button;
