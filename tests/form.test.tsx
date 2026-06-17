import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InquiryForm } from "@/components/forms/InquiryForm";
import { getDictionary } from "@/dictionaries";

describe("InquiryForm", () => {
  it("validates required fields before demo submission", () => {
    const dictionary = getDictionary("en");
    render(<InquiryForm dictionary={dictionary} mode="contact" />);

    fireEvent.click(screen.getByRole("button", { name: dictionary.forms.submit }));

    expect(screen.getByText(dictionary.forms.requiredError)).toBeInTheDocument();
  });

  it("shows the demo success message without storing data", () => {
    const dictionary = getDictionary("en");
    render(<InquiryForm dictionary={dictionary} mode="contact" />);

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Tea Friend" } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "tea@example.com" } });
    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: dictionary.forms.submit }));

    expect(screen.getByText(dictionary.forms.success)).toBeInTheDocument();
  });
});
