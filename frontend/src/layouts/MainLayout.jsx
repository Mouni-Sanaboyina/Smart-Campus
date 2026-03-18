import Sidebar from "./Sidebar";
import Header from "./Header";

function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-8">
  {children}
</main>
      </div>
    </div>
  );
}

export default MainLayout;