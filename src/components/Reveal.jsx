import {
  useEffect,
  useRef,
  useState,
} from "react";

function Reveal({
  children,
  direction = "up",
  delay = 0,
  className = "",
  once = true,
}) {
  const elementRef = useRef(null);
  const [visible, setVisible] =
    useState(false);

  useEffect(() => {
    const element =
      elementRef.current;

    if (!element) {
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);

            if (once) {
              observer.unobserve(
                entry.target,
              );
            }

            return;
          }

          if (!once) {
            setVisible(false);
          }
        },
        {
          threshold: 0.14,
          rootMargin:
            "0px 0px -48px 0px",
        },
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [once]);

  const directionClass =
    direction === "left"
      ? "reveal-left"
      : direction === "right"
        ? "reveal-right"
        : "";

  return (
    <div
      ref={elementRef}
      className={[
        "reveal",
        directionClass,
        visible
          ? "is-visible"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        transitionDelay:
          `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default Reveal;
