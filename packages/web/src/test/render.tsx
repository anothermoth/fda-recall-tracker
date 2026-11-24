import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

type Options = Omit<RenderOptions, "wrapper"> & {
  route?: string;
  routes?: string[];
};

export function renderWithRouter(ui: ReactElement, options: Options = {}) {
  const { route = "/", routes, ...rest } = options;
  const entries = routes ?? [route];

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        {children}
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}
