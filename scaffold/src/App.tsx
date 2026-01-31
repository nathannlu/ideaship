import { TooltipProvider } from "@/components/ui/tooltip";
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Button } from "./components/ui/button";
import { Toaster } from "@/components/ui/toaster";


const App = () => (            
<div>
  <TooltipProvider>
    <Toaster />
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Index />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>
  </TooltipProvider>
</div>
);  
    
export default App; 
