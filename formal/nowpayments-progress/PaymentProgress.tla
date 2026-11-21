---- MODULE PaymentProgress ----
EXTENDS Naturals

CONSTANTS GuardFinished, GuardDuplicate

VARIABLES status, delivery, finishedOnce, alerts

vars == <<status, delivery, finishedOnce, alerts>>
Sources == {"webhook", "reconciliation"}

Init ==
  /\ status = "waiting"
  /\ delivery = [source \in Sources |-> "not read"]
  /\ finishedOnce = FALSE
  /\ alerts = 0

ReadInvoice ==
  \E source \in Sources:
    /\ delivery[source] = "not read"
    /\ status = "waiting"
    /\ delivery' = [delivery EXCEPT ![source] = "in flight"]
    /\ UNCHANGED <<status, finishedOnce, alerts>>

Activate ==
  /\ ~finishedOnce
  /\ status' = "finished"
  /\ finishedOnce' = TRUE
  /\ UNCHANGED <<delivery, alerts>>

WritePartialProgress ==
  \E source \in Sources:
    /\ delivery[source] = "in flight"
    /\ delivery' = [delivery EXCEPT ![source] = "done"]
    /\ UNCHANGED finishedOnce
    /\ IF (GuardFinished /\ status = "finished")
          \/ (GuardDuplicate /\ status = "partially_paid")
       THEN UNCHANGED <<status, alerts>>
       ELSE /\ status' = "partially_paid"
            /\ alerts' = alerts + 1

Done ==
  /\ finishedOnce
  /\ \A source \in Sources: delivery[source] # "in flight"
  /\ UNCHANGED vars

Next == ReadInvoice \/ Activate \/ WritePartialProgress \/ Done
Spec == Init /\ [][Next]_vars

FinishedStaysFinished == finishedOnce => status = "finished"
OnlyOnePartialPaymentAlert == alerts <= 1
====
