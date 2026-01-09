export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-[#0f172a] py-8 mt-auto">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-center md:flex-row md:text-left">
        <p className="text-sm text-gray-500">© 2026 gaslsee. Built on OKX.</p>
        <div className="flex gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-white">
            Terms
          </a>
          <a href="#" className="hover:text-white">
            Privacy
          </a>
          <a href="#" className="hover:text-white">
            Docs
          </a>
        </div>
      </div>
    </footer>
  );
}
