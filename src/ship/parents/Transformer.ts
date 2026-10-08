import "server-only";

/** Chuyển model nội bộ thành DTO trả về API (khớp schema response trong defineRoute). */
export abstract class Transformer<Model, Dto> {
  abstract transform(model: Model): Dto;

  collection(models: readonly Model[]): Dto[] {
    return models.map((m) => this.transform(m));
  }
}
