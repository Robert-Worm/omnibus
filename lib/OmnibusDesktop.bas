Attribute VB_Name = "OmnibusDesktop"
Option Explicit

' Project Omnibus: explicit desktop actions only. No startup events or file IO.
' Import this module into the exported workbook and save that workbook as .xlsm.

Public Sub NieuwToetspunt()
    Dim points As ListObject, execution As ListObject
    Dim addedPoint As ListRow, addedExecution As ListRow
    Dim pointTitle As String, questionRefs As String, pointID As String
    Dim idCol As Long, titleCol As Long, refsCol As Long
    Dim executionID As Long, executionTitle As Long
    Dim previousEvents As Boolean, previousScreen As Boolean, changedState As Boolean
    Dim failure As String
    On Error GoTo Failed
    Set points = FindTable("Toetspunten", True)
    Set execution = FindTable("Uitvoering", False)
    idCol = RequireColumn(points, "ID")
    titleCol = RequireColumn(points, "Toetspunt")
    refsCol = RequireColumn(points, "Vragen")
    If Not execution Is Nothing Then
        executionID = RequireColumn(execution, "ID")
        executionTitle = RequireColumn(execution, "Toetspunt")
    End If
    If Not AskText("Naam van het nieuwe toetspunt:", "Nieuw toetspunt", "", True, pointTitle) Then Exit Sub
    If Not AskQuestionRefs(questionRefs) Then Exit Sub
    pointID = NextPointID(points, idCol)

    previousEvents = Application.EnableEvents
    previousScreen = Application.ScreenUpdating
    changedState = True
    Application.EnableEvents = False
    Application.ScreenUpdating = False
    Set addedPoint = points.ListRows.Add
    WriteLiteral addedPoint.Range.Cells(1, idCol), pointID
    WriteLiteral addedPoint.Range.Cells(1, titleCol), pointTitle
    WriteLiteral addedPoint.Range.Cells(1, refsCol), questionRefs
    If Not execution Is Nothing Then
        Set addedExecution = execution.ListRows.Add
        WriteLiteral addedExecution.Range.Cells(1, executionID), pointID
        ' Preserve the table's calculated title column when present.
        If Not addedExecution.Range.Cells(1, executionTitle).HasFormula Then
            WriteLiteral addedExecution.Range.Cells(1, executionTitle), pointTitle
        End If
    End If
    Application.EnableEvents = previousEvents
    Application.ScreenUpdating = previousScreen
    changedState = False
    ThisWorkbook.Activate
    points.Parent.Activate
    ClearTableFilters points
    addedPoint.Range.Cells(1, titleCol).Select
    MsgBox pointID & " is toegevoegd. Vul de norm, bron en overige gegevens aan.", vbInformation, "Project Omnibus"
    Exit Sub
Failed:
    failure = Err.Description
    On Error Resume Next
    If Not addedExecution Is Nothing Then addedExecution.Delete
    If Not addedPoint Is Nothing Then addedPoint.Delete
    If changedState Then
        Application.EnableEvents = previousEvents
        Application.ScreenUpdating = previousScreen
    End If
    On Error GoTo 0
    MsgBox "Het toetspunt kon niet worden toegevoegd. " & failure, vbExclamation, "Project Omnibus"
End Sub

Public Sub ToonVraag()
    Dim points As ListObject, refsCol As Long, requested As String
    Dim sourceCell As Range, item As Variant, values As Collection
    Dim criteria() As Variant, i As Long, value As String, sentinel As String
    On Error GoTo Failed
    Set points = FindTable("Toetspunten", True)
    refsCol = RequireColumn(points, "Vragen")
    If Not AskText("Vraagnummer, bijvoorbeeld 1.1. Gebruik * om het vraagfilter te wissen.", _
        "Toetspunten bij een vraag", ActiveQuestionNumber(), True, requested) Then Exit Sub
    If requested = "*" Then
        points.Range.AutoFilter Field:=refsCol
    Else
        If Not ValidQuestionNumber(requested) Then
            MsgBox "Gebruik een vraagnummer, bijvoorbeeld 1 of 1.2.", vbExclamation, "Project Omnibus"
            Exit Sub
        End If
        Set values = New Collection
        If Not points.DataBodyRange Is Nothing Then
            For Each sourceCell In points.ListColumns(refsCol).DataBodyRange.Cells
                If Not IsError(sourceCell.Value2) Then
                    value = CStr(sourceCell.Value2)
                    If HasQuestion(value, requested) Then
                        ' Duplicates in the criteria array are harmless; remove them for speed.
                        On Error Resume Next
                        values.Add value, LCase$(value)
                        On Error GoTo Failed
                    End If
                End If
            Next sourceCell
        End If
        If values.Count > 0 Then
            ReDim criteria(0 To values.Count - 1)
            For i = 1 To values.Count
                criteria(i - 1) = values(i)
            Next i
            points.Range.AutoFilter Field:=refsCol, Criteria1:=criteria, Operator:=xlFilterValues
        Else
            ' A verified absent value produces an empty result without editing any cells.
            sentinel = "OMNIBUS_GEEN_KOPPELING"
            Do While ColumnHasValue(points, refsCol, sentinel)
                sentinel = sentinel & "X"
            Loop
            points.Range.AutoFilter Field:=refsCol, Criteria1:="=" & sentinel
        End If
    End If
    ThisWorkbook.Activate
    points.Parent.Activate
    points.HeaderRowRange.Cells(1, refsCol).Select
    Exit Sub
Failed:
    MsgBox "Het vraagfilter kon niet worden toegepast. " & Err.Description, vbExclamation, "Project Omnibus"
End Sub

Public Sub RegistreerVersie()
    Dim versions As ListObject, target As ListRow, candidate As ListRow
    Dim versionCol As Long, dateCol As Long, nameCol As Long, changeCol As Long
    Dim version As String, person As String, description As String
    Dim added As Boolean, writing As Boolean, changedState As Boolean
    Dim previousEvents As Boolean, previousScreen As Boolean
    Dim formats(0 To 3) As Variant, failure As String
    On Error GoTo Failed
    Set versions = FindTable("Versies", True)
    versionCol = RequireColumn(versions, "Versie")
    dateCol = RequireColumn(versions, "Datum")
    nameCol = FirstColumn(versions, "Gewijzigd door", "Naam")
    changeCol = FirstColumn(versions, "Wijziging", "Wat en waar gewijzigd")
    If Not AskText("Versienummer, bijvoorbeeld 0.2:", "Versie registreren", "", True, version) Then Exit Sub
    If Not AskText("Wie heeft deze versie gewijzigd?", "Versie registreren", "", True, person) Then Exit Sub
    If Not AskText("Wat is gewijzigd?", "Versie registreren", "", True, description) Then Exit Sub

    For Each candidate In versions.ListRows
        If IsEmptyInput(candidate.Range.Cells(1, versionCol)) And _
           IsEmptyInput(candidate.Range.Cells(1, dateCol)) And _
           IsEmptyInput(candidate.Range.Cells(1, nameCol)) And _
           IsEmptyInput(candidate.Range.Cells(1, changeCol)) Then
            Set target = candidate
            Exit For
        End If
    Next candidate
    previousEvents = Application.EnableEvents
    previousScreen = Application.ScreenUpdating
    changedState = True
    Application.EnableEvents = False
    Application.ScreenUpdating = False
    If target Is Nothing Then
        Set target = versions.ListRows.Add
        added = True
    End If
    formats(0) = target.Range.Cells(1, versionCol).NumberFormat
    formats(1) = target.Range.Cells(1, dateCol).NumberFormat
    formats(2) = target.Range.Cells(1, nameCol).NumberFormat
    formats(3) = target.Range.Cells(1, changeCol).NumberFormat
    writing = True
    WriteLiteral target.Range.Cells(1, versionCol), version
    target.Range.Cells(1, dateCol).NumberFormat = "dd-mm-yyyy"
    target.Range.Cells(1, dateCol).Value = Date
    WriteLiteral target.Range.Cells(1, nameCol), person
    WriteLiteral target.Range.Cells(1, changeCol), description
    Application.EnableEvents = previousEvents
    Application.ScreenUpdating = previousScreen
    changedState = False
    writing = False
    ThisWorkbook.Activate
    versions.Parent.Activate
    ClearTableFilters versions
    target.Range.Cells(1, versionCol).Select
    MsgBox "Versie " & version & " is geregistreerd. Sla het bestand zelf op.", vbInformation, "Project Omnibus"
    Exit Sub
Failed:
    failure = Err.Description
    On Error Resume Next
    If added Then
        target.Delete
    ElseIf writing Then
        RestoreEmpty target.Range.Cells(1, versionCol), formats(0)
        RestoreEmpty target.Range.Cells(1, dateCol), formats(1)
        RestoreEmpty target.Range.Cells(1, nameCol), formats(2)
        RestoreEmpty target.Range.Cells(1, changeCol), formats(3)
    End If
    If changedState Then
        Application.EnableEvents = previousEvents
        Application.ScreenUpdating = previousScreen
    End If
    On Error GoTo 0
    MsgBox "De versie kon niet worden geregistreerd. " & failure, vbExclamation, "Project Omnibus"
End Sub

Public Sub InstalleerKnoppen()
    Dim ws As Worksheet, versions As ListObject, skipped As String, count As Long
    On Error GoTo Failed
    Set versions = FindTable("Versies", True)
    For Each ws In ThisWorkbook.Worksheets
        If ws.Name = versions.Parent.Name Or InStr(1, ws.Name, "Onderzoeksvragen", vbTextCompare) > 0 Then
            If Application.CountA(ws.Rows(1)) = 0 And ToolbarSpaceFree(ws) Then
                ws.Rows(1).RowHeight = 32
                If ws.Name = versions.Parent.Name Then
                    PutButton ws, "Omnibus_Versie", "Versie registreren", "RegistreerVersie", 8, 152
                    PutButton ws, "Omnibus_Punt", "Nieuw toetspunt", "NieuwToetspunt", 170, 145
                Else
                    PutButton ws, "Omnibus_Vraag", "Toetspunten bij vraag", "ToonVraag", 8, 170
                    PutButton ws, "Omnibus_Punt", "Nieuw toetspunt", "NieuwToetspunt", 188, 145
                End If
                count = count + 1
            Else
                skipped = skipped & vbCrLf & ws.Name
            End If
        End If
    Next ws
    MsgBox "Knoppen geplaatst op " & count & " werkblad(en)." & _
        IIf(Len(skipped) > 0, vbCrLf & "Overgeslagen: eerste rij bevat gegevens of een object." & skipped, ""), _
        vbInformation, "Project Omnibus"
    Exit Sub
Failed:
    MsgBox "De knoppen konden niet volledig worden geplaatst. " & Err.Description, vbExclamation, "Project Omnibus"
End Sub

Private Function ToolbarSpaceFree(ByVal ws As Worksheet) As Boolean
    Dim item As Shape
    For Each item In ws.Shapes
        If Left$(item.Name, 8) <> "Omnibus_" Then
            If item.Top < 32 And item.Top + item.Height > 0 And item.Left < 340 Then Exit Function
        End If
    Next item
    ToolbarSpaceFree = True
End Function

Private Sub PutButton(ByVal ws As Worksheet, ByVal shapeName As String, ByVal caption As String, _
                      ByVal procedureName As String, ByVal x As Double, ByVal width As Double)
    Dim button As Shape
    On Error Resume Next
    Set button = ws.Shapes(shapeName)
    On Error GoTo 0
    If button Is Nothing Then Set button = ws.Shapes.AddShape(msoShapeRoundedRectangle, x, 4, width, 24)
    With button
        .Name = shapeName
        .Left = x
        .Top = 4
        .Width = width
        .Height = 24
        .Placement = xlFreeFloating
        .Fill.ForeColor.RGB = RGB(35, 79, 124)
        .Line.Visible = msoFalse
        .TextFrame.Characters.Text = caption
        .TextFrame.Characters.Font.Name = "Arial"
        .TextFrame.Characters.Font.Size = 10
        .TextFrame.Characters.Font.Color = RGB(255, 255, 255)
        .TextFrame.HorizontalAlignment = xlHAlignCenter
        .TextFrame.VerticalAlignment = xlVAlignCenter
        .AlternativeText = caption
        .OnAction = "'" & Replace(ThisWorkbook.Name, "'", "''") & "'!" & procedureName
    End With
End Sub

Private Function FindTable(ByVal tableName As String, ByVal required As Boolean) As ListObject
    Dim ws As Worksheet, item As ListObject
    For Each ws In ThisWorkbook.Worksheets
        For Each item In ws.ListObjects
            If StrComp(item.Name, tableName, vbTextCompare) = 0 Then
                Set FindTable = item
                Exit Function
            End If
        Next item
    Next ws
    If required Then Err.Raise vbObjectError + 2000, "Project Omnibus", "Excel-tabel '" & tableName & "' ontbreekt."
End Function

Private Function RequireColumn(ByVal table As ListObject, ByVal caption As String) As Long
    Dim item As ListColumn
    For Each item In table.ListColumns
        If StrComp(item.Name, caption, vbTextCompare) = 0 Then RequireColumn = item.Index: Exit Function
    Next item
    Err.Raise vbObjectError + 2001, "Project Omnibus", "Kolom '" & caption & "' ontbreekt in " & table.Name & "."
End Function

Private Function FirstColumn(ByVal table As ListObject, ByVal preferred As String, ByVal fallback As String) As Long
    Dim item As ListColumn
    For Each item In table.ListColumns
        If StrComp(item.Name, preferred, vbTextCompare) = 0 Then FirstColumn = item.Index: Exit Function
    Next item
    FirstColumn = RequireColumn(table, fallback)
End Function

Private Function AskText(ByVal prompt As String, ByVal title As String, ByVal initial As String, _
                         ByVal required As Boolean, ByRef answer As String) As Boolean
    Dim response As Variant
    Do
        response = Application.InputBox(Prompt:=prompt, title:=title, Default:=initial, Type:=2)
        If VarType(response) = vbBoolean Then If response = False Then Exit Function
        answer = Trim$(CStr(response))
        If Len(answer) <= 32767 And (Not required Or Len(answer) > 0) Then
            AskText = True
            Exit Function
        End If
        MsgBox "Vul tekst in van maximaal 32767 tekens, of kies Annuleren.", vbExclamation, "Project Omnibus"
    Loop
End Function

Private Function AskQuestionRefs(ByRef answer As String) As Boolean
    Dim response As String, token As Variant, normalized As String, valid As Boolean
    Do
        If Not AskText("Vraagnummer(s), bijvoorbeeld 1.1;1.2. Leeg laten kan ook.", _
            "Koppeling aan onderzoeksvragen", "", False, response) Then Exit Function
        normalized = ""
        valid = True
        If Len(response) > 0 Then
            For Each token In Split(response, ";")
                If Not ValidQuestionNumber(Trim$(CStr(token))) Then valid = False: Exit For
                If Not HasQuestion(normalized, Trim$(CStr(token))) Then
                    If Len(normalized) > 0 Then normalized = normalized & ";"
                    normalized = normalized & Trim$(CStr(token))
                End If
            Next token
        End If
        If valid Then answer = normalized: AskQuestionRefs = True: Exit Function
        MsgBox "Gebruik nummers zoals 1 of 1.2, gescheiden door een puntkomma.", vbExclamation, "Project Omnibus"
    Loop
End Function

Private Function ValidQuestionNumber(ByVal value As String) As Boolean
    Dim part As Variant, i As Long, character As String
    If Len(value) = 0 Or Len(value) > 40 Then Exit Function
    For Each part In Split(value, ".")
        If Len(part) = 0 Then Exit Function
        For i = 1 To Len(part)
            character = Mid$(part, i, 1)
            If character < "0" Or character > "9" Then Exit Function
        Next i
    Next part
    ValidQuestionNumber = True
End Function

Private Function HasQuestion(ByVal list As String, ByVal requested As String) As Boolean
    Dim token As Variant
    If Len(requested) = 0 Then Exit Function
    For Each token In Split(list, ";")
        If StrComp(Trim$(CStr(token)), requested, vbTextCompare) = 0 Then HasQuestion = True: Exit Function
    Next token
End Function

Private Function ActiveQuestionNumber() As String
    Dim value As String, number As String, i As Long, character As String
    On Error GoTo NoNumber
    If Not ActiveWorkbook Is ThisWorkbook Then Exit Function
    If InStr(1, ActiveSheet.Name, "Onderzoeksvragen", vbTextCompare) = 0 Then Exit Function
    If ActiveCell.Row < 6 Then Exit Function
    value = CStr(ActiveSheet.Cells(ActiveCell.Row, 2).Value2)
    If Len(value) = 0 Or Left$(value, 1) < "0" Or Left$(value, 1) > "9" Then
        value = CStr(ActiveSheet.Cells(ActiveCell.Row, 1).MergeArea.Cells(1, 1).Value2)
    End If
    For i = 1 To Len(value)
        character = Mid$(value, i, 1)
        If (character >= "0" And character <= "9") Or character = "." Then
            number = number & character
        Else
            Exit For
        End If
    Next i
    If ValidQuestionNumber(number) Then ActiveQuestionNumber = number
NoNumber:
End Function

Private Function NextPointID(ByVal table As ListObject, ByVal idCol As Long) As String
    Dim n As Long, candidate As String
    For n = 1 To 999999
        candidate = "TP-E" & Format$(n, "000")
        If Not ColumnHasValue(table, idCol, candidate) Then NextPointID = candidate: Exit Function
    Next n
    Err.Raise vbObjectError + 2002, "Project Omnibus", "Geen vrij ID gevonden."
End Function

Private Function ColumnHasValue(ByVal table As ListObject, ByVal index As Long, ByVal value As String) As Boolean
    Dim item As Range
    If table.DataBodyRange Is Nothing Then Exit Function
    For Each item In table.ListColumns(index).DataBodyRange.Cells
        If Not IsError(item.Value2) Then
            If StrComp(Trim$(CStr(item.Value2)), value, vbTextCompare) = 0 Then ColumnHasValue = True: Exit Function
        End If
    Next item
End Function

Private Sub WriteLiteral(ByVal target As Range, ByVal value As String)
    target.NumberFormat = "@"
    target.Value2 = value
End Sub

Private Function IsEmptyInput(ByVal target As Range) As Boolean
    If target.HasFormula Or IsError(target.Value2) Then Exit Function
    IsEmptyInput = (Len(CStr(target.Value2)) = 0)
End Function

Private Sub RestoreEmpty(ByVal target As Range, ByVal previousFormat As Variant)
    target.ClearContents
    target.NumberFormat = previousFormat
End Sub

Private Sub ClearTableFilters(ByVal table As ListObject)
    If table.AutoFilter.FilterMode Then table.AutoFilter.ShowAllData
End Sub
