import { Page } from "@playwright/test";
import { BASE_URL } from "./env";

/**
 * Beneficiary "Create Scribe Request" form (/new-request), PU Semester Exam
 * variant. Selecting "Yes" on "This is a semester exam" reveals the Exam
 * Category / Semester Number fields used here.
 */
export class ExamRequestPage {
  readonly page: Page;
  readonly NEW_REQUEST_URL = `${BASE_URL}/new-request`;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.NEW_REQUEST_URL, { waitUntil: "networkidle" });
  }

  // "This is a semester exam" is a required Yes/No radio group (not a
  // checkbox) — confirmed live. Selecting "Yes" follows the Panjab
  // University semester flow (reveals Exam Category / Semester Number);
  // "No" keeps this a regular exam request.
  async selectSemesterExam(answer: "Yes" | "No"): Promise<void> {
    await this.page
      .getByRole("radiogroup", { name: "This is a semester exam" })
      .getByRole("radio", { name: answer })
      .click();
  }

  async selectExamCategory(category: string): Promise<void> {
    await this.page.getByRole("combobox", { name: "Exam Category *" }).click();
    await this.page.getByRole("option", { name: category }).click();
  }

  async selectSemesterNumber(semester: string): Promise<void> {
    await this.page
      .getByRole("combobox", { name: "Semester Number (All exam types) *" })
      .click();
    await this.page.getByRole("option", { name: semester }).click();
  }

  async fillExamTitle(title: string): Promise<void> {
    await this.page.getByRole("textbox", { name: "Exam Title" }).fill(title);
  }

  async fillMedium(medium: string): Promise<void> {
    await this.page
      .getByRole("textbox", { name: "Medium of Exam" })
      .fill(medium);
  }

  // The underlying <input type="file"> is sr-only (1 × 1 px, clipped) and
  // cannot be reached with a plain setInputFiles() call — Playwright's
  // actionability check rejects the clipped element.  Instead we click the
  // visible styled button, which opens a native file-chooser, and hand the
  // file to that chooser.  The waitForEvent listener must be registered
  // before (or concurrently with) the click; the 'filechooser' event can fire
  // as soon as the click resolves, so awaiting the click first would miss it.
  async uploadHallPass(filePath: string): Promise<void> {
    const [chooser] = await Promise.all([
      this.page.waitForEvent("filechooser"),
      this.page.locator('button[aria-label*="Admit Card"]').click(),
    ]);
    await chooser.setFiles(filePath);
  }

  async uploadDateSheet(filePath: string): Promise<void> {
    const [chooser] = await Promise.all([
      this.page.waitForEvent("filechooser"),
      this.page.locator('button[aria-label*="Date Sheet"]').click(),
    ]);
    await chooser.setFiles(filePath);
  }

  /**
   * Exam Center Name is a search-driven dropdown ("Search official PU
   * examination centre"), not free text — typing opens the suggestion list,
   * and any official centre in the results satisfies the requirement, so the
   * first suggestion is picked. Selecting one also auto-fills State (Exam
   * Center); City and Pin code remain separate manual text fields.
   *
   * Only shown when "This is a semester exam" is set to Yes. For a regular
   * (non-semester) request, Exam Center Name is a plain free-text field
   * instead — use fillExamCenterName() there.
   */
  async selectExamCenter(searchTerm: string): Promise<void> {
    await this.page
      .getByPlaceholder("Search official PU examination centre")
      .fill(searchTerm);
    const option = this.page.getByRole("option").first();
    await option.waitFor({ state: "visible", timeout: 10000 });
    await option.click();
  }

  // Plain-text Exam Center Name field for a regular (non-semester) request —
  // confirmed live: with "This is a semester exam" set to No, this field is
  // a free-text textbox, not the PU search-driven combobox above.
  async fillExamCenterName(name: string): Promise<void> {
    await this.page
      .getByRole("textbox", { name: "Exam Center Name" })
      .fill(name);
  }

  async fillExamCenterCity(city: string): Promise<void> {
    await this.page
      .getByRole("textbox", { name: "City (Exam Center)" })
      .fill(city);
  }

  async fillExamCenterPincode(pincode: string): Promise<void> {
    await this.page

      .getByRole("textbox", { name: "Pin code (Exam Center)" })

      .fill(pincode);
  }

  async fillExamCenterAddress(address: string): Promise<void> {
    await this.page
      .getByRole("textbox", { name: "Full Address of Exam Center" })
      .fill(address);
  }

  async fillSubjectName(subject: string): Promise<void> {
    await this.page
      .getByRole("textbox", { name: "Subject Name" })
      .fill(subject);
  }

  async selectExamDate(
    year: string,
    month: string,
    day: string,
  ): Promise<void> {
    await this.page.getByLabel("Exam Date Year").selectOption(year);
    await this.page.getByLabel("Exam Date Month").selectOption(month);
    await this.page.getByLabel("Exam Date Day").selectOption(day);
  }

  // Hour/minute options are unpadded ("9", not "09") for Start Time and
  // padded ("00"-"59") for the minute list — confirmed live, not a typo.
  async selectStartTime(
    hour: string,
    minute: string,
    ampm: "AM" | "PM",
  ): Promise<void> {
    await this.selectCustomTimeOption("Exam Time Start Time Hour", hour);
    await this.selectCustomTimeOption("Exam Time Start Time Minute", minute);
    await this.selectCustomTimeOption("Exam Time Start Time AM/PM", ampm);
  }

  async selectEndTime(
    hour: string,
    minute: string,
    ampm: "AM" | "PM",
  ): Promise<void> {
    await this.selectCustomTimeOption("Exam Time End Time Hour", hour);
    await this.selectCustomTimeOption("Exam Time End Time Minute", minute);
    await this.selectCustomTimeOption("Exam Time End Time AM/PM", ampm);
  }

  private async selectCustomTimeOption(
    comboboxName: string,
    value: string,
  ): Promise<void> {
    await this.page.getByRole("combobox", { name: comboboxName }).click();
    await this.page.getByRole("option", { name: value, exact: true }).click();
  }

  async fillNotes(notes: string): Promise<void> {
    await this.page
      .getByRole("textbox", { name: "Notes (If Any)" })
      .fill(notes);
  }

  async submit(): Promise<void> {
    await this.page.getByRole("button", { name: "Submit" }).click();
  }
}
