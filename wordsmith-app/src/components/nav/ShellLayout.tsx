import { ReactElement, useState } from "react";
import SiteNav from "@/components/nav/SiteNav";
import Footer from "@/components/landing/Footer";
import WordRain from "@/components/WordRain";
import { useKonami } from "@/lib/use-konami";

function Shell({
  variant,
  children,
}: {
  variant: "full" | "lean";
  children: ReactElement;
}) {
  const [rain, setRain] = useState(false);
  useKonami(() => setRain(true));
  return (
    <>
      <SiteNav variant={variant} />
      <main id="main-content">{children}</main>
      <Footer onSecret={() => setRain(true)} />
      {rain && <WordRain onDone={() => setRain(false)} />}
    </>
  );
}

export function withShell(variant: "full" | "lean") {
  return function getLayout(page: ReactElement): ReactElement {
    return <Shell variant={variant}>{page}</Shell>;
  };
}
