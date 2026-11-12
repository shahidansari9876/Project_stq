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
    await this.page.goto(this.NEW_REQUEST_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
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

  // Upload label is "Admit Card / Hall Ticket" on the PU semester form
  // (per puflow.md §1.4). The method name keeps the older "HallPass" wording.
  async uploadHallPass(filePath: string): Promise<void> {
    await this.uploadDocument(/admit card|hall ticket|hall pass/i, filePath);
  }

  async uploadDateSheet(filePath: string): Promise<void> {
    await this.uploadDocument(/date ?sheet/i, filePath);
  }

  /**
   * Upload a file into a specific upload card, identified by the text shown on
   * that card (`namePattern`).
   *
   * PRIMARY path sets the file straight onto that card's hidden
   * <input type="file">. Contrary to the old comment here, setInputFiles DOES
   * work on an sr-only / clipped input — unlike click(), it doesn't run the
   * visibility actionability check — so this needs no native OS file-chooser
   * and no specific trigger-button markup. The input is found relative to the
   * card's own label text (nearest enclosing element that contains a file
   * input), which keeps the Admit Card and Date Sheet inputs distinct.
   *
   * FALLBACK (only if no scoped input is found) clicks the visible trigger and
   * feeds the native chooser. The trigger is matched by ACCESSIBLE NAME
   * (visible text OR aria-label, case-insensitive). The previous
   * `button[aria-label*="Admit Card"]` CSS selector matched nothing because
   * CSS `*=` is case-sensitive and only inspects aria-label, whereas the real
   * trigger's name comes from its visible text. Both waits carry an explicit
   * timeout so a missing trigger fails fast with a clear error instead of
   * hanging until the test times out (which surfaces as the misleading
   * "Target page, context or browser has been closed").
   */
  private async uploadDocument(
    namePattern: RegExp,
    filePath: string,
    timeout = 15000,
  ): Promise<void> {
    const scopedInput = this.page
      .getByText(namePattern)
      .locator(
        'xpath=ancestor-or-self::*[.//input[@type="file"]][1]//input[@type="file"]',
      )
      .first();

    if ((await scopedInput.count()) > 0) {
      try {
        await scopedInput.setInputFiles(filePath);
        return;
      } catch {
        // Fall through to the native-chooser path below.
      }
    }

    const [chooser] = await Promise.all([
      this.page.waitForEvent("filechooser", { timeout }),
      this.page
        .getByRole("button", { name: namePattern })
        .first()
        .click({ timeout }),
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
