import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ScoreInput from "./ScoreInput";

describe("ScoreInput", () => {
  it("renders inputs and fires onChange and onSubmit", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <ScoreInput
        homeScore=""
        awayScore=""
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    );

    const homeInput = screen.getByPlaceholderText("H");
    const awayInput = screen.getByPlaceholderText("A");
    const submitButton = screen.getByRole("button", { name: "Submit" });

    fireEvent.change(homeInput, { target: { value: "2" } });
    fireEvent.change(awayInput, { target: { value: "1" } });
    fireEvent.click(submitButton);

    expect(onChange).toHaveBeenNthCalledWith(1, "homeScore", "2");
    expect(onChange).toHaveBeenNthCalledWith(2, "awayScore", "1");
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
