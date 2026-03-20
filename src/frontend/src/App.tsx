import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import ArticlesFeedPage from "./pages/ArticlesFeedPage";
import ChatPage from "./pages/ChatPage";
import CreateArticlePage from "./pages/CreateArticlePage";
import EditArticlePage from "./pages/EditArticlePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 30 } },
});

const rootRoute = createRootRoute();

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: () => {
    const token = localStorage.getItem("sessionToken");
    if (token) throw redirect({ to: "/chat" });
  },
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  beforeLoad: () => {
    const token = localStorage.getItem("sessionToken");
    if (token) throw redirect({ to: "/chat" });
  },
  component: RegisterPage,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  beforeLoad: () => {
    const token = localStorage.getItem("sessionToken");
    if (!token) throw redirect({ to: "/login" });
  },
  component: ChatPage,
});

const articlesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/articles",
  beforeLoad: () => {
    const token = localStorage.getItem("sessionToken");
    if (!token) throw redirect({ to: "/login" });
  },
  component: ArticlesFeedPage,
});

const articlesNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/articles/new",
  beforeLoad: () => {
    const token = localStorage.getItem("sessionToken");
    if (!token) throw redirect({ to: "/login" });
  },
  component: CreateArticlePage,
});

const articleDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/articles/$articleId",
  beforeLoad: () => {
    const token = localStorage.getItem("sessionToken");
    if (!token) throw redirect({ to: "/login" });
  },
  component: ArticleDetailPage,
});

const articleEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/articles/$articleId/edit",
  beforeLoad: () => {
    const token = localStorage.getItem("sessionToken");
    if (!token) throw redirect({ to: "/login" });
  },
  component: EditArticlePage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const token = localStorage.getItem("sessionToken");
    if (token) throw redirect({ to: "/chat" });
    throw redirect({ to: "/login" });
  },
  component: () => null,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  chatRoute,
  articlesRoute,
  articlesNewRoute,
  articleDetailRoute,
  articleEditRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
