import { runExpenseContract } from "./expenseContractRunner";
import { mockContractActor } from "./repositoryContractFixtures";
import { createMockExpenseRepository } from "@/repositories/mock/mockExpenseRepository";

runExpenseContract("mock", () => createMockExpenseRepository(), mockContractActor());
