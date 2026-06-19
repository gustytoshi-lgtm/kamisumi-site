import { runSettingsContract } from "./settingsContractRunner";
import { mockContractActor } from "./repositoryContractFixtures";
import { createMockSettingsRepository } from "@/repositories/mock/mockSettingsRepository";

runSettingsContract("mock", () => {
  const repo = createMockSettingsRepository();
  repo.seed();
  return repo;
}, mockContractActor());
