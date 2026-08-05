import { Injectable } from "@angular/core";
import { ActionService } from "./action.service";

@Injectable({ providedIn: 'root' })
export class HeaderActionService extends ActionService<void, void> {}