import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateCanvasBlocksDto } from "./update-canvas-blocks.dto.js";

function validPayload() {
  return {
    blocks: [
      { key: "valueProposition", content: "Des sacs faits main." },
      { key: "customerSegments", content: "Jeunes actifs urbains." },
      { key: "channels", content: "Instagram." },
      { key: "customerRelationships", content: "WhatsApp." },
      { key: "keyResources", content: "Machine a coudre." },
      { key: "keyActivities", content: "Production." },
      { key: "keyPartners", content: "Fournisseur de tissu." },
    ],
    source: "utilisateur_edite",
  };
}

describe("UpdateCanvasBlocksDto", () => {
  it("accepts a valid payload", async () => {
    const dto = plainToInstance(UpdateCanvasBlocksDto, validPayload());
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejects fewer than 7 blocks", async () => {
    const payload = validPayload();
    payload.blocks = payload.blocks.slice(0, 6);
    const dto = plainToInstance(UpdateCanvasBlocksDto, payload);
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "blocks")).toBe(true);
  });

  it("rejects an unknown block key", async () => {
    const payload = validPayload();
    payload.blocks[0] = { key: "unknownBlock", content: "x" };
    const dto = plainToInstance(UpdateCanvasBlocksDto, payload);
    const errors = await validate(dto);

    const blocksError = errors.find((e) => e.property === "blocks");
    expect(blocksError?.children?.some((c) => c.children?.some((cc) => cc.property === "key"))).toBe(true);
  });

  it("rejects duplicate block keys", async () => {
    const payload = validPayload();
    payload.blocks[6] = { key: "valueProposition", content: "Doublon." };
    const dto = plainToInstance(UpdateCanvasBlocksDto, payload);
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "blocks" && e.constraints?.arrayUnique)).toBe(true);
  });

  it("rejects a block content over 500 characters", async () => {
    const payload = validPayload();
    payload.blocks[0].content = "a".repeat(501);
    const dto = plainToInstance(UpdateCanvasBlocksDto, payload);
    const errors = await validate(dto);

    const blocksError = errors.find((e) => e.property === "blocks");
    expect(blocksError?.children?.some((c) => c.children?.some((cc) => cc.property === "content"))).toBe(true);
  });

  it("rejects an invalid source", async () => {
    const dto = plainToInstance(UpdateCanvasBlocksDto, { ...validPayload(), source: "autre" });
    const errors = await validate(dto);

    expect(errors.some((e) => e.property === "source")).toBe(true);
  });
});
