import { runMediaContract } from "./mediaContractRunner";
import { mockContractActor } from "./repositoryContractFixtures";
import { createMockMediaRepository } from "@/repositories/mock/mockMediaRepository";

runMediaContract("mock", () => createMockMediaRepository(), mockContractActor());
