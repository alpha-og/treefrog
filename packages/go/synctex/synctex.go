package synctex

type ViewResult struct {
	Page int     `json:"page"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	File string  `json:"file"`
	Line int     `json:"line"`
}

type EditResult struct {
	File string `json:"file"`
	Line int    `json:"line"`
	Col  int    `json:"col"`
}
