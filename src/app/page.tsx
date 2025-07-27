// app/page.tsx
import QuoteFormComponent from "@/components/QuoteFormComponent";

export default function Home() {
  // 状態管理やロジックは全てQuoteFormComponent内に移動したため、
  // このページはコンポーネントを呼び出すだけ。
  return (
    <main>
      <QuoteFormComponent />
    </main>
  );
}
