import { useEffect, useLayoutEffect, useRef, useState } from "react";

type AccordionProps = {
    children: React.ReactNode;
    className?: string;
    isOpen: boolean;
    durationMs?: number;
    id: string;
}
export function SidebarProjectsAccordion({ children, className, isOpen, durationMs = 200, id }: AccordionProps) {

    const [height, setHeight] = useState<number | 'auto'>(isOpen ? 'auto' : 0);
    const innerRef = useRef<HTMLDivElement | null>(null);
    const doneRef = useRef(false);

    useLayoutEffect(() => {
        const el = innerRef.current;
        if (!el) return;

        let rafId = 0;
        doneRef.current = false;

        if (!isOpen) {
            const current = el.scrollHeight;
            setHeight(current);
            rafId = requestAnimationFrame(() => setHeight(0));
            return () => cancelAnimationFrame(rafId);
        }

        const next = el.scrollHeight;
        setHeight(next);
        const onEnd = (e: TransitionEvent) => {
            if (e.target !== el || e.propertyName !== "height") return;
            if (doneRef.current) return
            doneRef.current = true
            setHeight("auto");
        };
        el.addEventListener("transitionend", onEnd);

        const fallback = setTimeout(() => {
            if (!doneRef.current) {
                doneRef.current = true;
                setHeight("auto");
            }
        }, durationMs + 50);

        return () => {
            el.removeEventListener("transitionend", onEnd);
            cancelAnimationFrame(rafId);
            clearTimeout(fallback);
        };

    }, [isOpen, durationMs]);

    useEffect(() => {
        const el = innerRef.current;
        if (!el || !isOpen) return;
        let frame = 0;
        const ro = new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                setHeight(prev => {
                    if (prev === 'auto') return prev;
                    const next = el.scrollHeight;
                    return prev === next ? prev : next;
                });
            });
        });
        ro.observe(el);
        return () => {
            ro.disconnect()
            cancelAnimationFrame(frame);
        };
    }, [isOpen]);

    return (
        <div ref={innerRef} className={className}
            id={id}
            inert={!isOpen}
            style={{
                height: height === 'auto' ? 'auto' : `${height}px`,
                transition: `height ${durationMs}ms ease, opacity ${durationMs}ms ease, transform ${durationMs}ms ease`,
                transform: isOpen ? 'translateY(0)' : 'translateY(-10px)',
                opacity: isOpen ? 1 : 0,
                overflow: "hidden",
            }}>
            {children}
        </div >
    )
}