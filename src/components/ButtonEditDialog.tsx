import { Plus, Trash2, Info, Save, MoreVertical, Search, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { BitrixField, getLeadStatuses } from "@/lib/bitrix";
import { BUTTON_CATEGORIES, type ButtonCategory, type ButtonLayout } from "@/lib/button-layout";
import { useState, useEffect } from "react";
import { createFlowFromButton } from "@/handlers/flowFromButton";
import type { Fl...