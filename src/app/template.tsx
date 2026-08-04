// Per-navigation enter animation.
//
// A server component on purpose. The animation is CSS (`.page-enter` in
// globals.css) rather than framer-motion, because framer-motion's `initial`
// prop is serialised into the server HTML — which put every page behind
// `style="opacity:0"` and made LCP wait for hydration. See the comment on the
// `page-enter` keyframes for the full story.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter flex flex-1 flex-col">{children}</div>;
}
